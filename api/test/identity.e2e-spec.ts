import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  accountSecurityEvents,
  accounts,
  type Account,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import type { AccountRequest } from '../src/identity/auth.types';
import { ClerkService } from '../src/identity/clerk.service';
import { IdentityService } from '../src/identity/identity.service';
import { OperatorService } from '../src/identity/operator.service';
import { RequireRole, RolesGuard } from '../src/identity/roles.guard';
import { ConfigService } from '@nestjs/config';

@Injectable()
class TestAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    request.account = { role: request.header('x-test-role') } as Account;
    return true;
  }
}

@Controller('__test/role')
@UseGuards(TestAccountGuard, RolesGuard)
class RoleTestController {
  @Get('coach')
  @RequireRole('Coach')
  coach() {
    return { role: 'Coach' };
  }

  @Get('athlete')
  @RequireRole('Athlete')
  athlete() {
    return { role: 'Athlete' };
  }
}

describe('Account identity (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  let config: ConfigService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [RoleTestController],
      providers: [TestAccountGuard, RolesGuard],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    database = moduleFixture.get(DatabaseService);
    config = moduleFixture.get(ConfigService);
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await database.client
        .delete(accountSecurityEvents)
        .where(eq(accountSecurityEvents.accountId, id));
      await database.client.delete(accounts).where(eq(accounts.id, id));
    }
    if (app) await app.close();
  });

  it('keeps role proof routes out of production and denies the wrong role', async () => {
    await request(app.getHttpServer())
      .get('/__test/role/coach')
      .set('x-test-role', 'Coach')
      .expect(200, { role: 'Coach' });
    await request(app.getHttpServer())
      .get('/__test/role/coach')
      .set('x-test-role', 'Athlete')
      .expect(403);
  });

  it('provisions and activates idempotently with one event per transition', async () => {
    const email = `identity-${Date.now()}@example.com`;
    const invitations: Array<{
      id: string;
      status: 'pending';
      publicMetadata: { dinoAccountId: string };
    }> = [];
    const listAccountInvitations = jest
      .fn()
      .mockImplementation(() => Promise.resolve(invitations));
    const createInvitation = jest
      .fn()
      .mockImplementation((_email, accountId) => {
        const invitation = {
          id: 'inv_1',
          status: 'pending' as const,
          publicMetadata: { dinoAccountId: accountId as string },
        };
        invitations.push(invitation);
        return Promise.resolve(invitation);
      });
    const getUser = jest.fn();
    const revokeAllSessions = jest
      .fn()
      .mockRejectedValueOnce(new Error('Clerk unavailable'))
      .mockResolvedValue(undefined);
    const clerk = {
      listAccountInvitations,
      createInvitation,
      revokeInvitation: jest.fn(),
      getUser,
      revokeAllSessions,
      hasActiveSessions: jest.fn().mockResolvedValue(false),
    } as unknown as ClerkService;
    const operator = new OperatorService(database, clerk, config);
    const first = await operator.provision({
      email,
      displayName: 'Private Coach',
      role: 'Coach',
    });
    createdIds.push(first.accountId);
    const second = await operator.provision({
      email,
      displayName: 'Private Coach',
      role: 'Coach',
    });
    expect(second.accountId).toBe(first.accountId);
    expect(createInvitation).toHaveBeenCalledTimes(1);

    getUser.mockResolvedValue({
      publicMetadata: { dinoAccountId: first.accountId },
      primaryEmailAddressId: 'email_1',
      emailAddresses: [{ id: 'email_1', emailAddress: email }],
    });
    const identity = new IdentityService(database, clerk);
    await identity.activate('user_1');
    await identity.activate('user_1');
    const events = await database.client
      .select()
      .from(accountSecurityEvents)
      .where(eq(accountSecurityEvents.accountId, first.accountId));
    expect(
      events.filter((event) => event.eventType === 'created'),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.eventType === 'activated'),
    ).toHaveLength(1);

    const [stored] = await database.client
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, first.accountId),
          eq(accounts.authSubject, 'user_1'),
        ),
      );
    expect(stored.role).toBe('Coach');
    await expect(
      database.client
        .update(accounts)
        .set({ role: 'Athlete' })
        .where(eq(accounts.id, first.accountId)),
    ).rejects.toThrow();

    const disabled = await operator.disable(first.accountId);
    expect(disabled.status).toBe('disabled');
    expect(disabled.outcome).toBe('reconciliation_required');
    const disabledAgain = await operator.disable(first.accountId);
    expect(disabledAgain.outcome).toBe('already_complete');
    expect(revokeAllSessions).toHaveBeenCalledTimes(2);
    const reactivated = await operator.reactivate(first.accountId);
    expect(reactivated.status).toBe('active');
    expect(
      await operator.resolveAccountId(undefined, email.toUpperCase()),
    ).toBe(first.accountId);

    const lifecycleEvents = await database.client
      .select()
      .from(accountSecurityEvents)
      .where(eq(accountSecurityEvents.accountId, first.accountId));
    expect(
      lifecycleEvents.filter((event) => event.eventType === 'disabled'),
    ).toHaveLength(1);
    expect(
      lifecycleEvents.filter((event) => event.eventType === 'reactivated'),
    ).toHaveLength(1);
  });

  it('reconciles provisioning after Clerk fails without duplicating local history', async () => {
    const email = `retry-${Date.now()}@example.com`;
    const invitations: Array<{ id: string; status: 'pending' }> = [];
    const clerk = {
      listAccountInvitations: jest
        .fn()
        .mockImplementation(() => Promise.resolve(invitations)),
      createInvitation: jest
        .fn()
        .mockRejectedValueOnce(new Error('Clerk unavailable'))
        .mockImplementation(() => {
          const invitation = { id: 'inv_retry', status: 'pending' as const };
          invitations.push(invitation);
          return Promise.resolve(invitation);
        }),
      revokeInvitation: jest.fn(),
    } as unknown as ClerkService;
    const operator = new OperatorService(database, clerk, config);
    const failed = await operator.provision({
      email,
      displayName: 'Retry Athlete',
      role: 'Athlete',
    });
    createdIds.push(failed.accountId);
    expect(failed.outcome).toBe('reconciliation_required');
    const reconciled = await operator.provision({
      email,
      displayName: 'Retry Athlete',
      role: 'Athlete',
    });
    expect(reconciled.outcome).toBe('completed');
    const events = await database.client
      .select()
      .from(accountSecurityEvents)
      .where(eq(accountSecurityEvents.accountId, failed.accountId));
    expect(
      events.filter((event) => event.eventType === 'created'),
    ).toHaveLength(1);
  });

  it('returns the generic accepted response for an unknown recovery email', async () => {
    await request(app.getHttpServer())
      .post('/auth/activation/resend')
      .send({ email: `unknown-${Date.now()}@example.com` })
      .expect(202, { accepted: true });
  });

  it('retains a cancelled pending account and one cancellation event', async () => {
    const email = `cancel-${Date.now()}@example.com`;
    const invitation = {
      id: 'inv_cancel',
      status: 'pending' as const,
      publicMetadata: { dinoAccountId: '' },
    };
    const clerk = {
      listAccountInvitations: jest.fn().mockResolvedValue([invitation]),
      createInvitation: jest.fn().mockResolvedValue(invitation),
      revokeInvitation: jest.fn().mockResolvedValue(undefined),
    } as unknown as ClerkService;
    const operator = new OperatorService(database, clerk, config);
    const account = await operator.provision({
      email,
      displayName: 'Pending Athlete',
      role: 'Athlete',
    });
    createdIds.push(account.accountId);
    const cancelled = await operator.cancel(account.accountId);
    expect(cancelled.status).toBe('cancelled');
    expect(await operator.cancel(account.accountId)).toMatchObject({
      status: 'cancelled',
      outcome: 'already_complete',
    });
    const [stored] = await database.client
      .select()
      .from(accounts)
      .where(eq(accounts.id, account.accountId));
    expect(stored).toMatchObject({ status: 'cancelled', authSubject: null });
    const events = await database.client
      .select()
      .from(accountSecurityEvents)
      .where(eq(accountSecurityEvents.accountId, account.accountId));
    expect(
      events.filter((event) => event.eventType === 'cancelled'),
    ).toHaveLength(1);
  });
});
