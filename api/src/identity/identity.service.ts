import { HttpStatus, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  accountSecurityEvents,
  accounts,
  type Account,
  type AccountRole,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { ClerkService } from './clerk.service';
import { IdentityException } from './identity-errors';

export type Me = Pick<Account, 'id' | 'displayName' | 'role' | 'status'>;

@Injectable()
export class IdentityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly clerk: ClerkService,
  ) {}

  toMe(account: Account): Me {
    return {
      id: account.id,
      displayName: account.displayName,
      role: account.role,
      status: account.status,
    };
  }

  async activate(subject: string): Promise<Me> {
    let clerkUser;
    try {
      clerkUser = await this.clerk.getUser(subject);
    } catch {
      throw new IdentityException(
        'IDENTITY_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        'Identity verification is temporarily unavailable.',
      );
    }
    const accountId = clerkUser.publicMetadata.dinoAccountId;
    const primaryEmail = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    );
    if (typeof accountId !== 'string' || !primaryEmail) {
      throw new IdentityException(
        'ACCOUNT_UNLINKED',
        HttpStatus.FORBIDDEN,
        'No pending Dino activation matches this identity.',
      );
    }
    const email = primaryEmail.emailAddress.trim().toLowerCase();

    return this.database.client.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for('update')
        .limit(1);
      if (!existing || existing.email !== email) {
        throw new IdentityException(
          'IDENTITY_CONFLICT',
          HttpStatus.CONFLICT,
          'The invitation does not match this identity.',
        );
      }
      if (existing.status === 'active' && existing.authSubject === subject) {
        return this.toMe(existing);
      }
      if (existing.status !== 'pending_activation' || existing.authSubject) {
        throw new IdentityException(
          'IDENTITY_CONFLICT',
          HttpStatus.CONFLICT,
          'The account cannot be activated by this identity.',
        );
      }
      const now = new Date();
      const [activated] = await tx
        .update(accounts)
        .set({
          authSubject: subject,
          status: 'active',
          activatedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(accounts.id, existing.id),
            eq(accounts.status, 'pending_activation'),
          ),
        )
        .returning();
      await tx.insert(accountSecurityEvents).values({
        accountId: existing.id,
        eventType: 'activated',
        actorType: 'account',
        actorIdentifier: existing.id,
      });
      return this.toMe(activated);
    });
  }

  static parseRole(value: string): AccountRole {
    if (value === 'Coach' || value === 'Athlete') return value;
    throw new Error('Role must be Coach or Athlete.');
  }
}
