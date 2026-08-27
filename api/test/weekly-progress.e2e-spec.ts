import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { inArray } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  accounts,
  coachingRelationships,
  rosterInvitations,
  workoutAssignments,
  workoutCompletions,
  workoutReviews,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import { ClerkService } from '../src/identity/clerk.service';

type WeeklySummaryBody = {
  assignedCount: number;
  dueCount: number;
  completedCount: number;
  awaitingReviewCount: number;
  reviewedCount: number;
  missedCount: number;
  progressPercent: number | null;
};

type AthleteDetailBody = {
  summary: WeeklySummaryBody;
  days: unknown[];
};

type CoachOverviewBody = {
  summary: WeeklySummaryBody & { activeAthleteCount: number };
  items: { athlete: { id: string } }[];
  nextCursor: string | null;
};

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10);
}

function currentMonday() {
  const today = new Date().toISOString().slice(0, 10);
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, -((day + 6) % 7));
}

describe('Weekly progress and review status (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  const coachId = randomUUID();
  const otherCoachId = randomUUID();
  const athleteId = randomUUID();
  const emptyAthleteId = randomUUID();
  const formerAthleteId = randomUUID();
  const accountIds = [
    coachId,
    otherCoachId,
    athleteId,
    emptyAthleteId,
    formerAthleteId,
  ];
  const invitationIds = [randomUUID(), randomUUID(), randomUUID()];
  const assignmentIds = [randomUUID(), randomUUID(), randomUUID()];
  const weekStart = addDays(currentMonday(), -7);

  beforeAll(async () => {
    const clerk = {
      verifySessionToken: jest.fn((token: string) => {
        const subjects: Record<string, string> = {
          'coach-token': 'weekly-coach',
          'other-coach-token': 'weekly-other-coach',
          'athlete-token': 'weekly-athlete',
        };
        return Promise.resolve({ sub: subjects[token] ?? 'unknown' });
      }),
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

    const now = new Date();
    await database.client.insert(accounts).values([
      {
        id: coachId,
        authSubject: 'weekly-coach',
        email: `weekly-${coachId}@example.com`,
        displayName: 'Coach Weekly',
        role: 'Coach',
        status: 'active',
        activatedAt: now,
      },
      {
        id: otherCoachId,
        authSubject: 'weekly-other-coach',
        email: `weekly-${otherCoachId}@example.com`,
        displayName: 'Coach Other',
        role: 'Coach',
        status: 'active',
        activatedAt: now,
      },
      {
        id: athleteId,
        authSubject: 'weekly-athlete',
        email: `weekly-${athleteId}@example.com`,
        displayName: 'Athlete Action',
        role: 'Athlete',
        status: 'active',
        activatedAt: now,
      },
      {
        id: emptyAthleteId,
        authSubject: `weekly-${emptyAthleteId}`,
        email: `weekly-${emptyAthleteId}@example.com`,
        displayName: 'Athlete Clear',
        role: 'Athlete',
        status: 'active',
        activatedAt: now,
      },
      {
        id: formerAthleteId,
        authSubject: `weekly-${formerAthleteId}`,
        email: `weekly-${formerAthleteId}@example.com`,
        displayName: 'Athlete Former',
        role: 'Athlete',
        status: 'active',
        activatedAt: now,
      },
    ]);
    await database.client.insert(rosterInvitations).values(
      [athleteId, emptyAthleteId, formerAthleteId].map((id, index) => ({
        id: invitationIds[index],
        coachAccountId: coachId,
        invitedEmail: `weekly-${id}@example.com`,
        athleteAccountId: id,
        status: 'accepted' as const,
        adultConfirmedAt: now,
        acceptedAt: now,
      })),
    );
    await database.client.insert(coachingRelationships).values([
      {
        coachAccountId: coachId,
        athleteAccountId: athleteId,
        sourceInvitationId: invitationIds[0],
        status: 'active',
      },
      {
        coachAccountId: coachId,
        athleteAccountId: emptyAthleteId,
        sourceInvitationId: invitationIds[1],
        status: 'active',
      },
      {
        coachAccountId: coachId,
        athleteAccountId: formerAthleteId,
        sourceInvitationId: invitationIds[2],
        status: 'ended',
        endedAt: now,
      },
    ]);
    await database.client.insert(workoutAssignments).values([
      {
        id: assignmentIds[0],
        coachAccountId: coachId,
        athleteAccountId: athleteId,
        title: 'Missed strength',
        assignedDate: weekStart,
        creationTimeZone: 'Asia/Manila',
        status: 'assigned',
      },
      {
        id: assignmentIds[1],
        coachAccountId: coachId,
        athleteAccountId: athleteId,
        title: 'Awaiting review',
        assignedDate: addDays(weekStart, 1),
        creationTimeZone: 'Asia/Manila',
        status: 'completed',
      },
      {
        id: assignmentIds[2],
        coachAccountId: coachId,
        athleteAccountId: athleteId,
        title: 'Reviewed session',
        assignedDate: addDays(weekStart, 2),
        creationTimeZone: 'Asia/Manila',
        status: 'reviewed',
      },
    ]);
    await database.client.insert(workoutCompletions).values([
      { assignmentId: assignmentIds[1], athleteAccountId: athleteId },
      { assignmentId: assignmentIds[2], athleteAccountId: athleteId },
    ]);
    await database.client.insert(workoutReviews).values({
      assignmentId: assignmentIds[2],
      coachAccountId: coachId,
    });
  });

  afterAll(async () => {
    if (!database) {
      if (app) await app.close();
      return;
    }
    await database.client
      .delete(workoutReviews)
      .where(inArray(workoutReviews.assignmentId, assignmentIds));
    await database.client
      .delete(workoutCompletions)
      .where(inArray(workoutCompletions.assignmentId, assignmentIds));
    await database.client
      .delete(workoutAssignments)
      .where(inArray(workoutAssignments.id, assignmentIds));
    await database.client
      .delete(coachingRelationships)
      .where(
        inArray(coachingRelationships.athleteAccountId, [
          athleteId,
          emptyAthleteId,
          formerAthleteId,
        ]),
      );
    await database.client
      .delete(rosterInvitations)
      .where(inArray(rosterInvitations.id, invitationIds));
    await database.client
      .delete(accounts)
      .where(inArray(accounts.id, accountIds));
    if (app) await app.close();
  });

  const query = () => `weekStart=${weekStart}&timeZone=Asia%2FManila`;

  it('returns the same completed, review, and missed record to Athlete and Coach', async () => {
    const athlete = await request(app.getHttpServer())
      .get(`/weekly-progress?${query()}`)
      .set('authorization', 'Bearer athlete-token')
      .expect(200);
    const coach = await request(app.getHttpServer())
      .get(`/weekly-progress/athletes/${athleteId}?${query()}`)
      .set('authorization', 'Bearer coach-token')
      .expect(200);

    const athleteBody = athlete.body as AthleteDetailBody;
    const coachBody = coach.body as AthleteDetailBody;
    expect(athleteBody.summary).toEqual(coachBody.summary);
    expect(athleteBody.days).toEqual(coachBody.days);
    expect(athleteBody.summary).toMatchObject({
      assignedCount: 3,
      dueCount: 3,
      completedCount: 2,
      awaitingReviewCount: 1,
      reviewedCount: 1,
      missedCount: 1,
      progressPercent: 67,
    });
  });

  it('orders actionable Athletes first and pages the active roster', async () => {
    const first = await request(app.getHttpServer())
      .get(`/weekly-progress?${query()}&limit=1`)
      .set('authorization', 'Bearer coach-token')
      .expect(200);
    const firstBody = first.body as CoachOverviewBody;
    expect(firstBody.items[0].athlete.id).toBe(athleteId);
    expect(firstBody.nextCursor).toEqual(expect.any(String));

    const second = await request(app.getHttpServer())
      .get(
        `/weekly-progress?${query()}&limit=1&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
      )
      .set('authorization', 'Bearer coach-token')
      .expect(200);
    const secondBody = second.body as CoachOverviewBody;
    expect(secondBody.items[0].athlete.id).toBe(emptyAthleteId);
    expect(secondBody.summary.activeAthleteCount).toBe(2);
  });

  it('denies former, unrelated, and wrong role access without disclosure', async () => {
    await request(app.getHttpServer())
      .get(`/weekly-progress/athletes/${formerAthleteId}?${query()}`)
      .set('authorization', 'Bearer coach-token')
      .expect(404);
    await request(app.getHttpServer())
      .get(`/weekly-progress/athletes/${athleteId}?${query()}`)
      .set('authorization', 'Bearer other-coach-token')
      .expect(404);
    await request(app.getHttpServer())
      .get(`/weekly-progress/athletes/${athleteId}?${query()}`)
      .set('authorization', 'Bearer athlete-token')
      .expect(403);
  });

  it('rejects invalid Monday and time zone input', async () => {
    await request(app.getHttpServer())
      .get(`/weekly-progress?${query()}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(
        `/weekly-progress?weekStart=${addDays(weekStart, 1)}&timeZone=Asia%2FManila`,
      )
      .set('authorization', 'Bearer athlete-token')
      .expect(422);
    await request(app.getHttpServer())
      .get(`/weekly-progress?weekStart=${weekStart}&timeZone=Nope%2FNowhere`)
      .set('authorization', 'Bearer athlete-token')
      .expect(422);
    await request(app.getHttpServer())
      .get(`/weekly-progress?${query()}&cursor=not-a-cursor`)
      .set('authorization', 'Bearer coach-token')
      .expect(422);
  });
});
