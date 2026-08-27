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
import { CatalogImportService } from '../src/templates/catalog-import.service';
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
    equipment: string;
    primaryMuscle: string;
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
    await moduleFixture.get(CatalogImportService).reconcile();
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

    const filtered = await request(app.getHttpServer())
      .get('/reference-exercises?equipment=Cable&primaryMuscle=Back')
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    expect(
      (filtered.body as ExercisePageBody).items.every(
        (item) => item.equipment === 'Cable' && item.primaryMuscle === 'Back',
      ),
    ).toBe(true);
  });

  it('normalizes and manages one Coach video without exposing the submitted URL', async () => {
    const [reference] = await database.client
      .select({ id: referenceExercises.id })
      .from(referenceExercises)
      .where(eq(referenceExercises.catalogStatus, 'active'))
      .limit(1);
    await request(app.getHttpServer())
      .post('/reference-exercises/video-preview')
      .set('x-dino-preview-role', 'coach')
      .send({ url: 'https://www.youtube.com/watch?v=abcdefghijk' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          provider: 'youtube',
          videoId: 'abcdefghijk',
          canonicalSourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        });
      });
    await request(app.getHttpServer())
      .put(`/reference-exercises/${reference.id}/video`)
      .set('x-dino-preview-role', 'coach')
      .send({
        url: 'https://youtu.be/abcdefghijk',
        creatorName: 'Test Creator',
        rightsConfirmed: true,
      })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/reference-exercises/${reference.id}/video`)
      .set('x-dino-preview-role', 'coach')
      .expect(204);
  });

  it('creates a private ordered template from selected references', async () => {
    const references = await database.client
      .select()
      .from(referenceExercises)
      .orderBy(referenceExercises.name)
      .limit(2);
    await request(app.getHttpServer())
      .put(`/reference-exercises/${references[0].id}/video`)
      .set('x-dino-preview-role', 'coach')
      .send({
        url: 'https://youtu.be/abcdefghijk',
        creatorName: 'Assignment Creator',
        rightsConfirmed: true,
      })
      .expect(200);
    const response = await request(app.getHttpServer())
      .post('/workout-templates')
      .set('x-dino-preview-role', 'coach')
      .send({
        name: 'My quick full body',
        overviewNote: 'Keep the session simple.',
        exercises: references.map((exercise) => ({
          referenceExerciseId: exercise.id,
          sets: 3,
          repetitions: '8 to 12',
        })),
      })
      .expect(201);
    const body = response.body as TemplateBody;
    createdTemplateIds.push(body.id);
    expect(body).toMatchObject({
      name: 'My quick full body',
      exercises: [
        {
          referenceExerciseId: references[0]?.id,
          position: 1,
          currentVideo: {
            provider: 'youtube',
            videoId: 'abcdefghijk',
            creatorName: 'Assignment Creator',
          },
        },
        {
          referenceExerciseId: references[1]?.id,
          position: 2,
          currentVideo: null,
        },
      ],
    });
    await request(app.getHttpServer())
      .delete(`/reference-exercises/${references[0].id}/video`)
      .set('x-dino-preview-role', 'coach')
      .expect(204);
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
