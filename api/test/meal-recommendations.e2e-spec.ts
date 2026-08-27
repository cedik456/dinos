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
  mealRecommendationPlans,
  rosterInvitations,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import { ClerkService } from '../src/identity/clerk.service';
import type {
  AthleteMealRecommendationsDto,
  CoachMealRecommendationsDto,
} from '../src/meal-recommendations/meal-recommendations.types';

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10);
}

function nextMonday() {
  const today = new Date().toISOString().slice(0, 10);
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, 8 - (day || 7));
}

describe('Meal recommendations (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  const coachId = randomUUID();
  const otherCoachId = randomUUID();
  const athleteId = randomUUID();
  const invitationId = randomUUID();
  const relationshipId = randomUUID();
  const accountIds = [coachId, otherCoachId, athleteId];
  const weekStart = nextMonday();
  const query = `weekStart=${weekStart}&timeZone=Asia%2FManila`;
  const saveBody = {
    weekStart,
    timeZone: 'Asia/Manila',
    expectedVersion: null,
    meals: [
      {
        dayOffset: 0,
        kind: 'breakfast',
        customName: null,
        position: 0,
        items: [
          { name: 'Oats', amount: '80.5', unit: 'g', position: 0 },
          { name: 'Milk', amount: '1', unit: 'cup', position: 1 },
        ],
      },
      {
        dayOffset: 0,
        kind: 'custom',
        customName: 'Pre workout',
        position: 1,
        items: [{ name: 'Banana', amount: '1', unit: 'pc', position: 0 }],
      },
    ],
  };

  beforeAll(async () => {
    const clerk = {
      verifySessionToken: jest.fn((token: string) => {
        const subjects: Record<string, string> = {
          'meal-coach-token': 'meal-coach',
          'meal-other-coach-token': 'meal-other-coach',
          'meal-athlete-token': 'meal-athlete',
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
        authSubject: 'meal-coach',
        email: `meal-${coachId}@example.com`,
        displayName: 'Coach Meals',
        role: 'Coach',
        status: 'active',
        activatedAt: now,
      },
      {
        id: otherCoachId,
        authSubject: 'meal-other-coach',
        email: `meal-${otherCoachId}@example.com`,
        displayName: 'Coach Other',
        role: 'Coach',
        status: 'active',
        activatedAt: now,
      },
      {
        id: athleteId,
        authSubject: 'meal-athlete',
        email: `meal-${athleteId}@example.com`,
        displayName: 'Athlete Meals',
        role: 'Athlete',
        status: 'active',
        activatedAt: now,
      },
    ]);
    await database.client.insert(rosterInvitations).values({
      id: invitationId,
      coachAccountId: coachId,
      invitedEmail: `meal-${athleteId}@example.com`,
      athleteAccountId: athleteId,
      status: 'accepted',
      adultConfirmedAt: now,
      acceptedAt: now,
    });
    await database.client.insert(coachingRelationships).values({
      id: relationshipId,
      coachAccountId: coachId,
      athleteAccountId: athleteId,
      sourceInvitationId: invitationId,
      status: 'active',
      startedAt: new Date(now.getTime() - 86_400_000),
    });
  });

  afterAll(async () => {
    if (!database) {
      if (app) await app.close();
      return;
    }
    await database.client
      .delete(mealRecommendationPlans)
      .where(
        inArray(mealRecommendationPlans.coachingRelationshipId, [
          relationshipId,
        ]),
      );
    await database.client
      .delete(coachingRelationships)
      .where(inArray(coachingRelationships.id, [relationshipId]));
    await database.client
      .delete(rosterInvitations)
      .where(inArray(rosterInvitations.id, [invitationId]));
    await database.client
      .delete(accounts)
      .where(inArray(accounts.id, accountIds));
    if (app) await app.close();
  });

  it('creates one ordered week and returns the same content to Coach and Athlete', async () => {
    const saved = await request(app.getHttpServer())
      .put(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send(saveBody)
      .expect(200);
    const savedBody = saved.body as CoachMealRecommendationsDto;

    expect(savedBody.version).toBe(1);
    expect(savedBody.days).toHaveLength(7);
    expect(savedBody.days[0].meals.map((meal) => meal.displayName)).toEqual([
      'Breakfast',
      'Pre workout',
    ]);
    expect(savedBody.days[0].meals[0].items.map((item) => item.name)).toEqual([
      'Oats',
      'Milk',
    ]);

    const athlete = await request(app.getHttpServer())
      .get(`/meal-recommendations?${query}`)
      .set('authorization', 'Bearer meal-athlete-token')
      .expect(200);
    const athleteBody = athlete.body as AthleteMealRecommendationsDto;
    expect(athleteBody.kind).toBe('athlete');
    expect(athleteBody.days[0].coachDisplayName).toBe('Coach Meals');
    expect(athleteBody.days[0].meals).toEqual(savedBody.days[0].meals);
    expect(
      athleteBody.days.slice(1).every((day) => day.meals.length === 0),
    ).toBe(true);
  });

  it('rejects stale writes without replacing the saved week', async () => {
    await request(app.getHttpServer())
      .put(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send({
        ...saveBody,
        expectedVersion: 1,
        meals: [
          {
            ...saveBody.meals[0],
            items: [{ name: 'Eggs', amount: '2', unit: 'pcs', position: 0 }],
          },
        ],
      })
      .expect(200);

    const conflict = await request(app.getHttpServer())
      .put(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send({ ...saveBody, expectedVersion: 1 })
      .expect(409);
    expect((conflict.body as { code: string }).code).toBe('MEAL_PLAN_CONFLICT');

    const current = await request(app.getHttpServer())
      .get(`/meal-recommendations/athletes/${athleteId}?${query}`)
      .set('authorization', 'Bearer meal-coach-token')
      .expect(200);
    const currentBody = current.body as CoachMealRecommendationsDto;
    expect(currentBody.version).toBe(2);
    expect(currentBody.days[0].meals[0].items[0].name).toBe('Eggs');
  });

  it('enforces role, ownership, authentication, and validation boundaries', async () => {
    await request(app.getHttpServer())
      .get(`/meal-recommendations/athletes/${athleteId}?${query}`)
      .set('authorization', 'Bearer meal-athlete-token')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/meal-recommendations?${query}`)
      .set('authorization', 'Bearer meal-coach-token')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/meal-recommendations/athletes/${athleteId}?${query}`)
      .set('authorization', 'Bearer meal-other-coach-token')
      .expect(404);
    await request(app.getHttpServer())
      .get(`/meal-recommendations?${query}`)
      .expect(401);
    await request(app.getHttpServer())
      .put(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send({ ...saveBody, expectedVersion: 2, meals: [] })
      .expect(422);
    await request(app.getHttpServer())
      .get(
        `/meal-recommendations/athletes/${athleteId}?weekStart=2026-08-25&timeZone=Asia%2FManila`,
      )
      .set('authorization', 'Bearer meal-coach-token')
      .expect(422);
  });

  it('requires explicit deletion and removes the week for both roles', async () => {
    await request(app.getHttpServer())
      .delete(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send({ weekStart, timeZone: 'Asia/Manila', expectedVersion: 1 })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/meal-recommendations/athletes/${athleteId}`)
      .set('authorization', 'Bearer meal-coach-token')
      .send({ weekStart, timeZone: 'Asia/Manila', expectedVersion: 2 })
      .expect(204);

    const athlete = await request(app.getHttpServer())
      .get(`/meal-recommendations?${query}`)
      .set('authorization', 'Bearer meal-athlete-token')
      .expect(200);
    const athleteBody = athlete.body as AthleteMealRecommendationsDto;
    expect(athleteBody.days.every((day) => day.meals.length === 0)).toBe(true);
  });
});
