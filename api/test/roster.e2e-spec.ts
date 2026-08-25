import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  accountSecurityEvents,
  accounts,
  assignmentExercises,
  coachingRelationships,
  rosterInvitations,
  workoutAssignments,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import { ClerkService } from '../src/identity/clerk.service';

type InvitationBody = { id: string; email: string; status: string };
type AcceptBody = {
  account: { id: string; displayName: string; role: string; status: string };
  coach: { id: string; displayName: string };
};
type ErrorBody = { code: string };
type AthletePageBody = {
  items: Array<{ athleteAccountId: string; displayName: string }>;
};
type WorkoutBody = {
  athlete: { id: string; displayName: string };
};

describe('Private roster invitations (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  const coachId = randomUUID();
  const otherCoachId = randomUUID();
  const athleteEmail = `athlete-${randomUUID()}@example.com`;
  const providerInvitations: Array<{
    id: string;
    emailAddress: string;
    publicMetadata: Record<string, unknown>;
    status: 'pending';
    createdAt: number;
  }> = [];

  beforeAll(async () => {
    const clerk = {
      verifySessionToken: jest.fn((token: string) =>
        Promise.resolve({
          sub:
            token === 'coach-token'
              ? 'coach-subject'
              : token === 'other-coach-token'
                ? 'other-coach-subject'
                : 'athlete-subject',
        }),
      ),
      getPrimaryEmail: jest.fn((subject: string) => {
        if (subject !== 'athlete-subject') throw new Error('Unknown Athlete');
        return Promise.resolve(athleteEmail);
      }),
      listRosterInvitations: jest.fn((email: string, invitationId: string) =>
        Promise.resolve(
          providerInvitations.filter(
            (item) =>
              item.emailAddress === email &&
              item.publicMetadata.dinoRosterInvitationId === invitationId,
          ),
        ),
      ),
      createRosterInvitation: jest.fn((email: string, invitationId: string) => {
        const invitation = {
          id: `inv_${providerInvitations.length + 1}`,
          emailAddress: email,
          publicMetadata: { dinoRosterInvitationId: invitationId },
          status: 'pending' as const,
          createdAt: Date.now(),
        };
        providerInvitations.push(invitation);
        return Promise.resolve(invitation);
      }),
      revokeInvitation: jest.fn(() => Promise.resolve(undefined)),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClerkService)
      .useValue(clerk)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    database = moduleFixture.get(DatabaseService);
    await database.client.insert(accounts).values([
      {
        id: coachId,
        authSubject: 'coach-subject',
        email: `coach-${coachId}@example.com`,
        displayName: 'Coach One',
        role: 'Coach',
        status: 'active',
        activatedAt: new Date(),
      },
      {
        id: otherCoachId,
        authSubject: 'other-coach-subject',
        email: `coach-${otherCoachId}@example.com`,
        displayName: 'Coach Two',
        role: 'Coach',
        status: 'active',
        activatedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    const invitations = await database.client
      .select({
        id: rosterInvitations.id,
        athleteId: rosterInvitations.athleteAccountId,
      })
      .from(rosterInvitations)
      .where(eq(rosterInvitations.invitedEmail, athleteEmail));
    const athleteIds = invitations
      .map((item) => item.athleteId)
      .filter((id): id is string => Boolean(id));
    if (athleteIds.length) {
      const assignments = await database.client
        .select({ id: workoutAssignments.id })
        .from(workoutAssignments)
        .where(inArray(workoutAssignments.athleteAccountId, athleteIds));
      const assignmentIds = assignments.map((item) => item.id);
      if (assignmentIds.length) {
        await database.client
          .delete(assignmentExercises)
          .where(inArray(assignmentExercises.assignmentId, assignmentIds));
        await database.client
          .delete(workoutAssignments)
          .where(inArray(workoutAssignments.id, assignmentIds));
      }
      await database.client
        .delete(coachingRelationships)
        .where(inArray(coachingRelationships.athleteAccountId, athleteIds));
    }
    if (invitations.length) {
      await database.client.delete(rosterInvitations).where(
        inArray(
          rosterInvitations.id,
          invitations.map((item) => item.id),
        ),
      );
    }
    if (athleteIds.length) {
      await database.client
        .delete(accountSecurityEvents)
        .where(inArray(accountSecurityEvents.accountId, athleteIds));
      await database.client
        .delete(accounts)
        .where(inArray(accounts.id, athleteIds));
    }
    await database.client
      .delete(accounts)
      .where(inArray(accounts.id, [coachId, otherCoachId]));
    if (app) await app.close();
  });

  it('invites, accepts, lists, and assigns through one private roster', async () => {
    const created = await request(app.getHttpServer())
      .post('/roster-invitations')
      .set('authorization', 'Bearer coach-token')
      .send({ email: athleteEmail.toUpperCase() })
      .expect(201);
    const createdBody = created.body as InvitationBody;
    expect(createdBody).toMatchObject({
      email: athleteEmail,
      status: 'pending',
    });
    expect(providerInvitations).toHaveLength(1);

    const invitationId = createdBody.id;
    await request(app.getHttpServer())
      .post(`/roster-invitations/${invitationId}/revoke`)
      .set('authorization', 'Bearer other-coach-token')
      .expect(404)
      .expect(({ body }) => {
        expect((body as ErrorBody).code).toBe('INVITATION_UNAVAILABLE');
        expect(JSON.stringify(body)).not.toContain(athleteEmail);
      });

    await request(app.getHttpServer())
      .get('/roster-invitations/mine')
      .set('authorization', 'Bearer athlete-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: invitationId,
          coachDisplayName: 'Coach One',
          status: 'pending',
        });
      });

    const accepted = await request(app.getHttpServer())
      .post(`/roster-invitations/${invitationId}/accept`)
      .set('authorization', 'Bearer athlete-token')
      .send({ displayName: 'Avery Athlete', adultConfirmed: true })
      .expect(201);
    const acceptedBody = accepted.body as AcceptBody;
    expect(acceptedBody).toMatchObject({
      account: {
        displayName: 'Avery Athlete',
        role: 'Athlete',
        status: 'active',
      },
      coach: { id: coachId, displayName: 'Coach One' },
    });
    const athleteAccountId = acceptedBody.account.id;

    await request(app.getHttpServer())
      .get('/roster/athletes')
      .set('authorization', 'Bearer coach-token')
      .expect(200)
      .expect(({ body }) => {
        expect((body as AthletePageBody).items).toEqual([
          expect.objectContaining({
            athleteAccountId,
            displayName: 'Avery Athlete',
          }),
        ]);
      });

    const assignedDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    await request(app.getHttpServer())
      .post('/workout-assignments')
      .set('authorization', 'Bearer coach-token')
      .send({
        athleteAccountId,
        title: 'Roster strength session',
        assignedDate,
        creationTimeZone: 'Asia/Manila',
        exercises: [{ name: 'Squat', sets: 3, repetitions: '8' }],
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as WorkoutBody).athlete).toEqual({
          id: athleteAccountId,
          displayName: 'Avery Athlete',
        });
      });
  });
});
