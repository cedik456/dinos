import { HttpStatus, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  accountSecurityEvents,
  accounts,
  coachingRelationships,
  rosterInvitations,
  type RosterInvitation,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { ClerkService } from '../identity/clerk.service';
import { IdentityException } from '../identity/identity-errors';
import { RosterLimiterService } from './roster-limiter.service';
import type {
  RosterActor,
  RosterAthletePageDto,
  RosterInvitationDto,
  RosterInvitationPageDto,
  RosterListInput,
} from './roster.types';
import {
  athleteCursor,
  encodeAthleteCursor,
  encodeInvitationCursor,
  invitationCursor,
} from './roster-validation';

const sevenDays = 7 * 24 * 60 * 60 * 1000;
const rosterAthlete = alias(accounts, 'roster_athlete');
const rosterCoach = alias(accounts, 'roster_coach');

function rosterError(
  code: ConstructorParameters<typeof IdentityException>[0],
  status: HttpStatus,
  message: string,
): never {
  throw new IdentityException(code, status, message);
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && error.code === '23505') return true;
  return 'cause' in error && isUniqueViolation(error.cause);
}

@Injectable()
export class RosterService {
  constructor(
    private readonly database: DatabaseService,
    private readonly clerk: ClerkService,
    private readonly limiter: RosterLimiterService,
  ) {}

  async create(
    actor: RosterActor,
    email: string,
  ): Promise<RosterInvitationDto> {
    this.assertCoach(actor);
    this.limiter.assertCreateAllowed(actor.id);
    await this.assertEmailAvailable(email);

    let invitation: RosterInvitation;
    try {
      [invitation] = await this.database.client
        .insert(rosterInvitations)
        .values({ coachAccountId: actor.id, invitedEmail: email })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) return this.unavailable();
      throw error;
    }
    return this.deliver(invitation);
  }

  async listInvitations(
    actor: RosterActor,
    input: RosterListInput,
  ): Promise<RosterInvitationPageDto> {
    this.assertCoach(actor);
    await this.expirePending(actor.id);
    const conditions: SQL[] = [
      eq(rosterInvitations.coachAccountId, actor.id),
      inArray(rosterInvitations.status, ['sending', 'pending', 'failed']),
    ];
    if (input.cursor) {
      const cursor = invitationCursor(input.cursor, actor.id);
      conditions.push(
        sql`(${rosterInvitations.createdAt}, ${rosterInvitations.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      );
    }
    const rows = await this.database.client
      .select()
      .from(rosterInvitations)
      .where(and(...conditions))
      .orderBy(desc(rosterInvitations.createdAt), desc(rosterInvitations.id))
      .limit(input.limit + 1);
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => this.toInvitation(row)),
      nextCursor:
        hasMore && last
          ? encodeInvitationCursor({
              coachId: actor.id,
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async resend(actor: RosterActor, invitationId: string) {
    this.assertCoach(actor);
    this.limiter.assertResendAllowed(invitationId);
    const invitation = await this.ownedInvitation(actor.id, invitationId);
    if (!['pending', 'failed'].includes(invitation.status)) {
      return rosterError(
        'INVITATION_STATE_CONFLICT',
        HttpStatus.CONFLICT,
        'This invitation can no longer be sent.',
      );
    }
    if (
      invitation.status === 'pending' &&
      invitation.expiresAt &&
      invitation.expiresAt <= new Date()
    ) {
      await this.database.client
        .update(rosterInvitations)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(rosterInvitations.id, invitation.id));
      return rosterError(
        'INVITATION_EXPIRED',
        HttpStatus.GONE,
        'This invitation has expired.',
      );
    }
    if (invitation.clerkInvitationId) {
      try {
        await this.clerk.revokeInvitation(invitation.clerkInvitationId);
      } catch {
        // Local state stays authoritative. Rare provider leftovers are manual.
      }
    }
    const [sending] = await this.database.client
      .update(rosterInvitations)
      .set({
        status: 'sending',
        clerkInvitationId: null,
        expiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rosterInvitations.id, invitation.id),
          eq(rosterInvitations.coachAccountId, actor.id),
        ),
      )
      .returning();
    return this.deliver(sending);
  }

  async revoke(actor: RosterActor, invitationId: string) {
    this.assertCoach(actor);
    const invitation = await this.ownedInvitation(actor.id, invitationId);
    if (!['pending', 'failed'].includes(invitation.status)) {
      return rosterError(
        'INVITATION_STATE_CONFLICT',
        HttpStatus.CONFLICT,
        'This invitation can no longer be revoked.',
      );
    }
    const now = new Date();
    const [revoked] = await this.database.client
      .update(rosterInvitations)
      .set({ status: 'revoked', revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(rosterInvitations.id, invitation.id),
          eq(rosterInvitations.coachAccountId, actor.id),
          inArray(rosterInvitations.status, ['pending', 'failed']),
        ),
      )
      .returning();
    if (!revoked) return this.notFound();
    if (invitation.clerkInvitationId) {
      try {
        await this.clerk.revokeInvitation(invitation.clerkInvitationId);
      } catch {
        // The invitation is already unusable in Dino.
      }
    }
    return this.toInvitation(revoked);
  }

  async mine(subject: string) {
    const email = await this.verifiedEmail(subject);
    await this.expirePending(undefined, email);
    const [row] = await this.database.client
      .select({
        id: rosterInvitations.id,
        coachDisplayName: rosterCoach.displayName,
        expiresAt: rosterInvitations.expiresAt,
        status: rosterInvitations.status,
      })
      .from(rosterInvitations)
      .innerJoin(
        rosterCoach,
        eq(rosterCoach.id, rosterInvitations.coachAccountId),
      )
      .where(
        and(
          eq(rosterInvitations.invitedEmail, email),
          eq(rosterInvitations.status, 'pending'),
        ),
      )
      .limit(1);
    if (!row) return this.unavailable(HttpStatus.NOT_FOUND);
    return {
      id: row.id,
      coachDisplayName: row.coachDisplayName,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      status: row.status,
    };
  }

  async accept(
    subject: string,
    invitationId: string,
    input: { displayName?: string; adultConfirmed: boolean },
  ) {
    if (input.adultConfirmed !== true) {
      return rosterError(
        'VALIDATION_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Adult confirmation is required.',
      );
    }
    const email = await this.verifiedEmail(subject);
    const now = new Date();
    try {
      return await this.database.client.transaction(async (tx) => {
        const [invitation] = await tx
          .select()
          .from(rosterInvitations)
          .where(
            and(
              eq(rosterInvitations.id, invitationId),
              eq(rosterInvitations.invitedEmail, email),
            ),
          )
          .for('update')
          .limit(1);
        if (!invitation) return this.unavailable(HttpStatus.NOT_FOUND);
        if (
          invitation.status === 'pending' &&
          invitation.expiresAt &&
          invitation.expiresAt <= now
        ) {
          await tx
            .update(rosterInvitations)
            .set({ status: 'expired', updatedAt: now })
            .where(eq(rosterInvitations.id, invitation.id));
          return rosterError(
            'INVITATION_EXPIRED',
            HttpStatus.GONE,
            'This invitation has expired.',
          );
        }
        if (invitation.status === 'revoked') {
          return rosterError(
            'INVITATION_REVOKED',
            HttpStatus.GONE,
            'This invitation was revoked.',
          );
        }
        if (invitation.status !== 'pending') {
          return rosterError(
            'INVITATION_STATE_CONFLICT',
            HttpStatus.CONFLICT,
            'This invitation cannot be accepted.',
          );
        }

        const [existing] = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.email, email))
          .for('update')
          .limit(1);
        let athlete = existing;
        if (athlete) {
          if (
            athlete.role !== 'Athlete' ||
            athlete.status !== 'active' ||
            athlete.authSubject !== subject
          ) {
            return this.unavailable();
          }
        } else {
          const displayName = input.displayName?.trim();
          if (!displayName || [...displayName].length > 100) {
            return rosterError(
              'VALIDATION_FAILED',
              HttpStatus.UNPROCESSABLE_ENTITY,
              'displayName must contain 1 through 100 characters.',
            );
          }
          [athlete] = await tx
            .insert(accounts)
            .values({
              authSubject: subject,
              email,
              displayName,
              role: 'Athlete',
              status: 'active',
              activatedAt: now,
            })
            .returning();
          await tx.insert(accountSecurityEvents).values([
            {
              accountId: athlete.id,
              eventType: 'created',
              actorType: 'account',
              actorIdentifier: athlete.id,
            },
            {
              accountId: athlete.id,
              eventType: 'activated',
              actorType: 'account',
              actorIdentifier: athlete.id,
            },
          ]);
        }

        const [relationship] = await tx
          .insert(coachingRelationships)
          .values({
            coachAccountId: invitation.coachAccountId,
            athleteAccountId: athlete.id,
            sourceInvitationId: invitation.id,
            startedAt: now,
          })
          .returning({ id: coachingRelationships.id });
        await tx
          .update(rosterInvitations)
          .set({
            athleteAccountId: athlete.id,
            status: 'accepted',
            adultConfirmedAt: now,
            acceptedAt: now,
            updatedAt: now,
          })
          .where(eq(rosterInvitations.id, invitation.id));

        const [coach] = await tx
          .select({ id: accounts.id, displayName: accounts.displayName })
          .from(accounts)
          .where(eq(accounts.id, invitation.coachAccountId))
          .limit(1);
        return {
          account: {
            id: athlete.id,
            displayName: athlete.displayName,
            role: athlete.role,
            status: athlete.status,
          },
          coach,
          relationshipId: relationship.id,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return this.unavailable();
      throw error;
    }
  }

  async listAthletes(
    actor: RosterActor,
    input: RosterListInput,
  ): Promise<RosterAthletePageDto> {
    this.assertCoach(actor);
    const conditions: SQL[] = [
      eq(coachingRelationships.coachAccountId, actor.id),
      eq(coachingRelationships.status, 'active'),
    ];
    if (input.cursor) {
      const cursor = athleteCursor(input.cursor, actor.id);
      conditions.push(
        sql`(lower(${rosterAthlete.displayName}), ${rosterAthlete.id}) > (lower(${cursor.displayName}), ${cursor.id}::uuid)`,
      );
    }
    const rows = await this.database.client
      .select({
        relationshipId: coachingRelationships.id,
        athleteAccountId: rosterAthlete.id,
        displayName: rosterAthlete.displayName,
        startedAt: coachingRelationships.startedAt,
      })
      .from(coachingRelationships)
      .innerJoin(
        rosterAthlete,
        eq(rosterAthlete.id, coachingRelationships.athleteAccountId),
      )
      .where(and(...conditions))
      .orderBy(
        asc(sql`lower(${rosterAthlete.displayName})`),
        asc(rosterAthlete.id),
      )
      .limit(input.limit + 1);
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => ({
        ...row,
        startedAt: row.startedAt.toISOString(),
      })),
      nextCursor:
        hasMore && last
          ? encodeAthleteCursor({
              coachId: actor.id,
              displayName: last.displayName,
              id: last.athleteAccountId,
            })
          : null,
    };
  }

  private async deliver(
    invitation: RosterInvitation,
  ): Promise<RosterInvitationDto> {
    try {
      const existing = await this.clerk.listRosterInvitations(
        invitation.invitedEmail,
        invitation.id,
      );
      const provider =
        existing.find((item) => item.status === 'pending') ??
        (await this.clerk.createRosterInvitation(
          invitation.invitedEmail,
          invitation.id,
        ));
      const now = new Date();
      const [pending] = await this.database.client
        .update(rosterInvitations)
        .set({
          clerkInvitationId: provider.id,
          status: 'pending',
          expiresAt: new Date(provider.createdAt + sevenDays),
          updatedAt: now,
        })
        .where(
          and(
            eq(rosterInvitations.id, invitation.id),
            eq(rosterInvitations.status, 'sending'),
          ),
        )
        .returning();
      return this.toInvitation(pending);
    } catch {
      const [failed] = await this.database.client
        .update(rosterInvitations)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(
          and(
            eq(rosterInvitations.id, invitation.id),
            eq(rosterInvitations.status, 'sending'),
          ),
        )
        .returning();
      return this.toInvitation(failed ?? invitation);
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const [account] = await this.database.client
      .select({ id: accounts.id, role: accounts.role, status: accounts.status })
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1);
    if (!account) return;
    if (account.role !== 'Athlete' || account.status !== 'active') {
      return this.unavailable();
    }
    const [relationship] = await this.database.client
      .select({ id: coachingRelationships.id })
      .from(coachingRelationships)
      .where(
        and(
          eq(coachingRelationships.athleteAccountId, account.id),
          eq(coachingRelationships.status, 'active'),
        ),
      )
      .limit(1);
    if (relationship) return this.unavailable();
  }

  private async ownedInvitation(coachId: string, invitationId: string) {
    const [invitation] = await this.database.client
      .select()
      .from(rosterInvitations)
      .where(
        and(
          eq(rosterInvitations.id, invitationId),
          eq(rosterInvitations.coachAccountId, coachId),
        ),
      )
      .limit(1);
    if (!invitation) return this.notFound();
    return invitation;
  }

  private async expirePending(coachId?: string, email?: string) {
    const conditions = [
      eq(rosterInvitations.status, 'pending'),
      lt(rosterInvitations.expiresAt, new Date()),
    ];
    if (coachId) conditions.push(eq(rosterInvitations.coachAccountId, coachId));
    if (email) conditions.push(eq(rosterInvitations.invitedEmail, email));
    await this.database.client
      .update(rosterInvitations)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(and(...conditions));
  }

  private async verifiedEmail(subject: string): Promise<string> {
    try {
      return await this.clerk.getPrimaryEmail(subject);
    } catch {
      return rosterError(
        'IDENTITY_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        'Identity verification is temporarily unavailable.',
      );
    }
  }

  private assertCoach(actor: RosterActor): void {
    if (actor.role !== 'Coach') {
      return rosterError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only a Coach can manage a roster.',
      );
    }
  }

  private toInvitation(row: RosterInvitation): RosterInvitationDto {
    return {
      id: row.id,
      email: row.invitedEmail,
      status: row.status,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private unavailable(status = HttpStatus.CONFLICT): never {
    return rosterError(
      'INVITATION_UNAVAILABLE',
      status,
      'This invitation is unavailable.',
    );
  }

  private notFound(): never {
    return rosterError(
      'INVITATION_UNAVAILABLE',
      HttpStatus.NOT_FOUND,
      'This invitation is unavailable.',
    );
  }
}
