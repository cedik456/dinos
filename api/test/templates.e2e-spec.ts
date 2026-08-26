import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  accounts,
  referenceExercises,
  workoutTemplateExercises,
  workoutTemplates,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import { PreviewSeedService } from '../src/workouts/preview-seed.service';

type TemplateBody = { id: string; name: string; exercises: unknown[] };
type TemplatePageBody = {
  items: Array<{
    id: string;
    name: string;
    scope: string;
    exercises: unknown[];
  }>;
  nextCursor: string | null;
};
type ExercisePageBody = {
  items: Array<{
    id: string;
    name: string;
    defaultSets: number;
    defaultRepetitions: string;
  }>;
  nextCursor: string | null;
};

describe('Minimal workout templates (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  const createdTemplateIds: string[] = [];
  const otherCoachId = '40000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.DINO_PREVIEW_ACCESS_ENABLED = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          ...process.env,
          NODE_ENV: 'development',
          DINO_PREVIEW_ACCESS_ENABLED: true,
        }),
      )
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    database = moduleFixture.get(DatabaseService);
    await moduleFixture.get(PreviewSeedService).reconcile();
    await database.client
      .insert(accounts)
      .values({
        id: otherCoachId,
        authSubject: 'templates-other-coach',
        email: 'templates-other-coach@example.test',
        displayName: 'Other Coach',
        role: 'Coach',
        status: 'active',
        activatedAt: new Date(),
      })
      .onConflictDoNothing();
    const [otherTemplate] = await database.client
      .insert(workoutTemplates)
      .values({
        coachAccountId: otherCoachId,
        name: 'Private other Coach template',
      })
      .returning({ id: workoutTemplates.id });
    createdTemplateIds.push(otherTemplate.id);
  });

  afterAll(async () => {
    if (database && createdTemplateIds.length > 0) {
      await database.client
        .delete(workoutTemplateExercises)
        .where(
          inArray(workoutTemplateExercises.templateId, createdTemplateIds),
        );
      await database.client
        .delete(workoutTemplates)
        .where(inArray(workoutTemplates.id, createdTemplateIds));
    }
    if (database) {
      await database.client
        .delete(accounts)
        .where(eq(accounts.id, otherCoachId));
    }
    if (app) await app.close();
    delete process.env.DINO_PREVIEW_ACCESS_ENABLED;
    process.env.NODE_ENV = 'test';
  });

  it('shows the ordered Dino starter without leaking another Coach template', async () => {
    const response = await request(app.getHttpServer())
      .get('/workout-templates')
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    const body = response.body as TemplatePageBody;
    expect(body.items[0]).toMatchObject({
      name: 'Full Body A',
      scope: 'Dino',
    });
    expect(body.items[0]?.exercises).toHaveLength(8);
    expect(body.items.map((item) => item.name)).not.toContain(
      'Private other Coach template',
    );

    const detail = await request(app.getHttpServer())
      .get(`/workout-templates/${body.items[0]?.id}`)
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    expect(detail.body).toMatchObject({
      id: body.items[0]?.id,
      name: 'Full Body A',
      scope: 'Dino',
    });
    expect((detail.body as TemplateBody).exercises).toHaveLength(8);
  });

  it('hides another Coach private template from detail access', async () => {
    await request(app.getHttpServer())
      .get(`/workout-templates/${createdTemplateIds[0]}`)
      .set('x-dino-preview-role', 'coach')
      .expect(404)
      .expect(({ body }) => {
        expect((body as { code?: string }).code).toBe('TEMPLATE_NOT_FOUND');
      });
  });

  it('searches and paginates reference exercises', async () => {
    const search = await request(app.getHttpServer())
      .get('/reference-exercises?q=cable')
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    const searchBody = search.body as ExercisePageBody;
    expect(searchBody.items.length).toBeGreaterThan(1);
    expect(
      searchBody.items.every((item) =>
        item.name.toLowerCase().includes('cable'),
      ),
    ).toBe(true);

    const first = await request(app.getHttpServer())
      .get('/reference-exercises?limit=1')
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    const firstBody = first.body as ExercisePageBody;
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.nextCursor).toEqual(expect.any(String));
    const second = await request(app.getHttpServer())
      .get(`/reference-exercises?limit=1&cursor=${firstBody.nextCursor}`)
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    const secondBody = second.body as ExercisePageBody;
    expect(secondBody.items[0]?.id).not.toBe(firstBody.items[0]?.id);
  });

  it('creates a private ordered template from selected references', async () => {
    const references = await database.client
      .select()
      .from(referenceExercises)
      .orderBy(referenceExercises.name)
      .limit(2);
    const response = await request(app.getHttpServer())
      .post('/workout-templates')
      .set('x-dino-preview-role', 'coach')
      .send({
        name: 'My quick full body',
        overviewNote: 'Keep the session simple.',
        exercises: references.map((exercise) => ({
          referenceExerciseId: exercise.id,
          sets: exercise.defaultSets,
          repetitions: exercise.defaultRepetitions,
          instruction: exercise.instruction,
        })),
      })
      .expect(201);
    const body = response.body as TemplateBody;
    createdTemplateIds.push(body.id);
    expect(body).toMatchObject({
      name: 'My quick full body',
      exercises: [
        { referenceExerciseId: references[0]?.id, position: 1 },
        { referenceExerciseId: references[1]?.id, position: 2 },
      ],
    });
  });

  it('rejects unknown and repeated reference exercises', async () => {
    const [reference] = await database.client
      .select()
      .from(referenceExercises)
      .limit(1);
    const exercise = {
      referenceExerciseId: reference.id,
      sets: 3,
      repetitions: '8 to 12',
      instruction: null,
    };
    await request(app.getHttpServer())
      .post('/workout-templates')
      .set('x-dino-preview-role', 'coach')
      .send({ name: 'Repeated', exercises: [exercise, exercise] })
      .expect(422);
    await request(app.getHttpServer())
      .post('/workout-templates')
      .set('x-dino-preview-role', 'coach')
      .send({
        name: 'Unknown',
        exercises: [
          {
            ...exercise,
            referenceExerciseId: '99999999-9999-4999-8999-999999999999',
          },
        ],
      })
      .expect(422);
  });

  it('keeps template access Coach only', async () => {
    await request(app.getHttpServer()).get('/workout-templates').expect(401);
    await request(app.getHttpServer())
      .get('/workout-templates')
      .set('x-dino-preview-role', 'athlete')
      .expect(403);
    await request(app.getHttpServer())
      .post('/workout-templates')
      .set('x-dino-preview-role', 'athlete')
      .send({ name: 'Forbidden', exercises: [] })
      .expect(403);
  });
});
