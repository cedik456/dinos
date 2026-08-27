import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import {
  accountSecurityEvents,
  accounts,
  type Account,
  type AccountRole,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { ClerkService } from './clerk.service';

export type OperatorResult = {
  accountId: string;
  status: Account['status'];
  clerkState:
    | 'active_invitation'
    | 'revoked'
    | 'sessions_revoked'
    | 'not_applicable'
    | 'retry_required';
  outcome: 'completed' | 'already_complete' | 'reconciliation_required';
};

@Injectable()
export class OperatorService {
  private readonly operatorId: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly clerk: ClerkService,
    config: ConfigService,
  ) {
    this.operatorId = config.getOrThrow<string>('DINO_OPERATOR_ID');
  }

  async provision(input: {
    email: string;
    displayName: string;
    role: AccountRole;
  }): Promise<OperatorResult> {
    const email = input.email.trim().toLowerCase();
    const [existing] = await this.database.client
      .select()
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1);
    const account =
      existing ??
      (await this.database.client.transaction(async (tx) => {
        const [created] = await tx
          .insert(accounts)
          .values({
            email,
            displayName: input.displayName.trim(),
            role: input.role,
          })
          .returning();
        await tx.insert(accountSecurityEvents).values({
          accountId: created.id,
          eventType: 'created',
          actorType: 'operator',
          actorIdentifier: this.operatorId,
        });
        return created;
      }));
    if (
      account.displayName !== input.displayName.trim() ||
      account.role !== input.role ||
      account.status !== 'pending_activation'
    ) {
      throw new Error(
        'The email already belongs to a different or completed account.',
      );
    }
    try {
      const invitations = await this.clerk.listAccountInvitations(
        email,
        account.id,
      );
      const active = invitations.filter((item) => item.status === 'pending');
      const createdInvitation = active.length === 0;
      if (createdInvitation)
        await this.clerk.createInvitation(email, account.id);
      await Promise.all(
        active.slice(1).map((item) => this.clerk.revokeInvitation(item.id)),
      );
      return {
        accountId: account.id,
        status: account.status,
        clerkState: 'active_invitation',
        outcome: createdInvitation ? 'completed' : 'already_complete',
      };
    } catch {
      return {
        accountId: account.id,
        status: account.status,
        clerkState: 'retry_required',
        outcome: 'reconciliation_required',
      };
    }
  }

  async inspect(accountId: string): Promise<OperatorResult> {
    const account = await this.getAccount(accountId);
    return {
      accountId: account.id,
      status: account.status,
      clerkState: 'not_applicable',
      outcome: 'already_complete',
    };
  }

  async resolveAccountId(accountId?: string, email?: string): Promise<string> {
    if (!accountId && !email) {
      throw new Error('An exact --account-id or --email is required.');
    }
    const account = accountId
      ? await this.getAccount(accountId)
      : await this.getAccountByEmail(email!);
    if (email && account.email !== email.trim().toLowerCase()) {
      throw new Error('The supplied email does not match the Account id.');
    }
    return account.id;
  }

  async disable(accountId: string): Promise<OperatorResult> {
    const account = await this.getAccount(accountId);
    let changed = false;
    if (account.status === 'active') {
      await this.transition(account, 'active', 'disabled', 'disabled');
      changed = true;
    } else if (account.status !== 'disabled') {
      throw new Error('Only an active account can be disabled.');
    }
    try {
      await this.clerk.revokeAllSessions(account.authSubject!);
      return {
        accountId,
        status: 'disabled',
        clerkState: 'sessions_revoked',
        outcome: changed ? 'completed' : 'already_complete',
      };
    } catch {
      return {
        accountId,
        status: 'disabled',
        clerkState: 'retry_required',
        outcome: 'reconciliation_required',
      };
    }
  }

  async reactivate(accountId: string): Promise<OperatorResult> {
    const account = await this.getAccount(accountId);
    if (account.status === 'active') {
      return {
        accountId,
        status: 'active',
        clerkState: 'sessions_revoked',
        outcome: 'already_complete',
      };
    }
    if (account.status !== 'disabled' || !account.authSubject) {
      throw new Error('Only a disabled account can be reactivated.');
    }
    if (await this.clerk.hasActiveSessions(account.authSubject)) {
      throw new Error('Clerk still reports an active earlier session.');
    }
    await this.transition(account, 'disabled', 'active', 'reactivated');
    return {
      accountId,
      status: 'active',
      clerkState: 'sessions_revoked',
      outcome: 'completed',
    };
  }

  async cancel(accountId: string): Promise<OperatorResult> {
    const account = await this.getAccount(accountId);
    if (account.status === 'cancelled') {
      return {
        accountId,
        status: 'cancelled',
        clerkState: 'revoked',
        outcome: 'already_complete',
      };
    }
    if (account.status !== 'pending_activation') {
      throw new Error('Only a pending account can be cancelled.');
    }
    const invitations = await this.clerk.listAccountInvitations(
      account.email,
      account.id,
    );
    await Promise.all(
      invitations
        .filter((item) => item.status === 'pending')
        .map((item) => this.clerk.revokeInvitation(item.id)),
    );
    await this.transition(
      account,
      'pending_activation',
      'cancelled',
      'cancelled',
    );
    return {
      accountId,
      status: 'cancelled',
      clerkState: 'revoked',
      outcome: 'completed',
    };
  }

  private async getAccount(accountId: string): Promise<Account> {
    const [account] = await this.database.client
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);
    if (!account) throw new Error('Account not found.');
    return account;
  }

  private async getAccountByEmail(email: string): Promise<Account> {
    const [account] = await this.database.client
      .select()
      .from(accounts)
      .where(eq(accounts.email, email.trim().toLowerCase()))
      .limit(1);
    if (!account) throw new Error('Account not found.');
    return account;
  }

  private async transition(
    account: Account,
    from: Account['status'],
    to: Account['status'],
    eventType: 'disabled' | 'reactivated' | 'cancelled',
  ): Promise<void> {
    await this.database.client.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(accounts)
        .set({
          status: to,
          updatedAt: now,
          disabledAt: to === 'disabled' ? now : account.disabledAt,
          cancelledAt: to === 'cancelled' ? now : account.cancelledAt,
        })
        .where(and(eq(accounts.id, account.id), eq(accounts.status, from)))
        .returning({ id: accounts.id });
      if (!updated) throw new Error('The account changed during this command.');
      await tx.insert(accountSecurityEvents).values({
        accountId: account.id,
        eventType,
        actorType: 'operator',
        actorIdentifier: this.operatorId,
      });
    });
  }
}
