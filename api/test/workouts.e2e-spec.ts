import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  assignmentExercises,
  workoutAssignments,
  workoutCompletions,
  workoutReviews,
} from '../src/database/schema';
import { DatabaseService } from '../src/database/database.service';
import { CatalogImportService } from '../src/templates/catalog-import.service';
import { PreviewSeedService } from '../src/workouts/preview-seed.service';

const TEST_REFERENCE_EXERCISE_ID = '20000000-0000-4000-8000-000000000001';

type AssignmentBody = { id: string };
type AssignmentPageBody = {
  items: Array<{
    id: string;
    status: string;
    awaitingReview: boolean;
    actions: { canComplete: boolean; canReview: boolean };
  }>;
};
type ErrorBody = { code: string; [key: string]: unknown };

function dateInTimeZone(timeZone: string, offsetDays = 0) {
  const instant = new Date();
  instant.setUTCDate(instant.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function workoutInput(
  assignedDate: string,
  creationTimeZone: string,
  title: string,
) {
  return {
    title,
    overviewNote: null,
    assignedDate,
    creationTimeZone,
    exercises: [
      {
        referenceExerciseId: TEST_REFERENCE_EXERCISE_ID,
        sets: 3,
        repetitions: '10',
      },
    ],
  };
}

describe('First assigned workout loop (e2e)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  const createdAssignmentIds: string[] = [];

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
  });

  afterAll(async () => {
    for (const id of createdAssignmentIds) {
      await database.client
        .delete(workoutReviews)
        .where(eq(workoutReviews.assignmentId, id));
      await database.client
        .delete(workoutCompletions)
        .where(eq(workoutCompletions.assignmentId, id));
      await database.client
        .delete(assignmentExercises)
        .where(eq(assignmentExercises.assignmentId, id));
      await database.client
        .delete(workoutAssignments)
        .where(eq(workoutAssignments.id, id));
    }
    if (app) await app.close();
    delete process.env.DINO_PREVIEW_ACCESS_ENABLED;
    process.env.NODE_ENV = 'test';
  });

  it('moves one assignment from Coach creation through Athlete completion and Coach review', async () => {
    const assignedDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const createBody = {
      title: 'Lower body strength',
      overviewNote: 'Move with control.',
      assignedDate,
      creationTimeZone: 'Asia/Manila',
      exercises: [
        {
          referenceExerciseId: TEST_REFERENCE_EXERCISE_ID,
          sets: 3,
          repetitions: '8 to 12',
        },
      ],
    };

    await request(app.getHttpServer())
      .put(`/reference-exercises/${TEST_REFERENCE_EXERCISE_ID}/video`)
      .set('x-dino-preview-role', 'coach')
      .send({
        url: 'https://youtu.be/abcdefghijk',
        creatorName: 'Test Creator',
        rightsConfirmed: true,
      })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/workout-assignments')
      .set('x-dino-preview-role', 'coach')
      .send(createBody)
      .expect(201);
    const createdBody = created.body as AssignmentBody;
    createdAssignmentIds.push(createdBody.id);
    expect(created.body).toMatchObject({
      title: createBody.title,
      status: 'assigned',
      overviewNote: createBody.overviewNote,
      completion: null,
      review: null,
      actions: { canEdit: true, canComplete: false, canReview: false },
      exercises: [
        {
          referenceExerciseId: TEST_REFERENCE_EXERCISE_ID,
          illustrationFrames: [{ index: 1 }, { index: 2 }, { index: 3 }],
          video: {
            provider: 'youtube',
            videoId: 'abcdefghijk',
            creatorName: 'Test Creator',
          },
        },
      ],
    });

    await request(app.getHttpServer())
      .delete(`/reference-exercises/${TEST_REFERENCE_EXERCISE_ID}/video`)
      .set('x-dino-preview-role', 'coach')
      .expect(204);
    await request(app.getHttpServer())
      .get(`/workout-assignments/${createdBody.id}`)
      .set('x-dino-preview-role', 'athlete')
      .expect(200)
      .expect(({ body }) => {
        expect(
          (body as { exercises: Array<{ video: { videoId: string } }> })
            .exercises[0]?.video.videoId,
        ).toBe('abcdefghijk');
      });

    const retried = await request(app.getHttpServer())
      .post('/workout-assignments')
      .set('x-dino-preview-role', 'coach')
      .send(createBody)
      .expect(201);
    const retriedBody = retried.body as AssignmentBody;
    expect(retriedBody.id).toBe(createdBody.id);

    const athletePlan = await request(app.getHttpServer())
      .get('/workout-assignments?relative=today')
      .set('x-dino-preview-role', 'athlete')
      .expect(200);
    const athletePlanBody = athletePlan.body as AssignmentPageBody;
    expect(athletePlanBody.items).toHaveLength(1);
    expect(athletePlanBody.items[0]).toMatchObject({
      id: createdBody.id,
      status: 'assigned',
    });
    expect(athletePlanBody.items[0]?.actions.canComplete).toBe(true);

    const completed = await request(app.getHttpServer())
      .post(`/workout-assignments/${createdBody.id}/complete`)
      .set('x-dino-preview-role', 'athlete')
      .send({ note: 'Felt strong today.' })
      .expect(201);
    expect(completed.body).toMatchObject({
      status: 'completed',
      completion: { note: 'Felt strong today.' },
      actions: { canEdit: false, canComplete: false, canReview: false },
    });

    const reviewQueue = await request(app.getHttpServer())
      .get('/workout-assignments?awaitingReview=true')
      .set('x-dino-preview-role', 'coach')
      .expect(200);
    const reviewQueueBody = reviewQueue.body as AssignmentPageBody;
    expect(reviewQueueBody.items).toHaveLength(1);
    expect(reviewQueueBody.items[0]).toMatchObject({
      id: createdBody.id,
      awaitingReview: true,
    });
    expect(reviewQueueBody.items[0]?.actions.canReview).toBe(true);

    const reviewed = await request(app.getHttpServer())
      .post(`/workout-assignments/${createdBody.id}/review`)
      .set('x-dino-preview-role', 'coach')
      .send({ response: 'Strong work. Add load next time.' })
      .expect(201);
    expect(reviewed.body).toMatchObject({
      status: 'reviewed',
      review: { response: 'Strong work. Add load next time.' },
      actions: { canEdit: false, canComplete: false, canReview: false },
    });

    const athleteFinal = await request(app.getHttpServer())
      .get(`/workout-assignments/${createdBody.id}`)
      .set('x-dino-preview-role', 'athlete')
      .expect(200);
    expect(athleteFinal.body).toMatchObject({
      status: 'reviewed',
      review: { response: 'Strong work. Add load next time.' },
    });
  });

  it('fails closed when preview access is invalid and hides foreign ids', async () => {
    await request(app.getHttpServer())
      .get('/workout-assignments')
      .set('x-dino-preview-role', 'invalid')
      .expect(401)
      .expect(({ body }) => {
        const errorBody = body as ErrorBody;
        expect(errorBody).toMatchObject({
          code: 'AUTH_REQUIRED',
          message: 'Valid authentication is required.',
        });
        expect(typeof errorBody.requestId).toBe('string');
      });

    await request(app.getHttpServer())
      .get('/workout-assignments/00000000-0000-4000-8000-000000000000')
      .set('x-dino-preview-role', 'athlete')
      .expect(404)
      .expect(({ body }) => {
        const errorBody = body as ErrorBody;
        expect(errorBody.code).toBe('WORKOUT_NOT_FOUND');
        expect(JSON.stringify(errorBody)).not.toContain('Lower body strength');
      });
  });

  it('advances each cursor without repeating an assignment', async () => {
    for (const offset of [3, 4, 5]) {
      const input = workoutInput(
        dateInTimeZone('Asia/Manila', offset),
        'Asia/Manila',
        `Pagination workout ${offset}`,
      );
      const response = await request(app.getHttpServer())
        .post('/workout-assignments')
        .set('x-dino-preview-role', 'coach')
        .send(input)
        .expect(201);
      createdAssignmentIds.push((response.body as AssignmentBody).id);
    }

    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({
        relative: 'upcoming',
        direction: 'asc',
        limit: '1',
      });
      if (cursor) query.set('cursor', cursor);
      const response = await request(app.getHttpServer())
        .get(`/workout-assignments?${query.toString()}`)
        .set('x-dino-preview-role', 'coach')
        .expect(200);
      const page = response.body as AssignmentPageBody & {
        nextCursor: string | null;
      };
      expect(page.items).toHaveLength(1);
      expect(seen.has(page.items[0].id)).toBe(false);
      seen.add(page.items[0].id);
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen.size).toBe(3);
  });

  it('allows only one winner when edit and completion overlap', async () => {
    const manilaDate = dateInTimeZone('Asia/Manila');
    const raceTimeZone = ['Pacific/Kiritimati', 'Etc/GMT+12'].find(
      (timeZone) => dateInTimeZone(timeZone) !== manilaDate,
    )!;
    const input = workoutInput(
      dateInTimeZone(raceTimeZone),
      raceTimeZone,
      'Race workout',
    );
    const created = await request(app.getHttpServer())
      .post('/workout-assignments')
      .set('x-dino-preview-role', 'coach')
      .send(input)
      .expect(201);
    const id = (created.body as AssignmentBody).id;
    createdAssignmentIds.push(id);

    let releaseLock!: () => void;
    let reportLockReady!: () => void;
    const lockReady = new Promise<void>((resolve) => {
      reportLockReady = resolve;
    });
    const lockReleased = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const blocker = database.client.transaction(async (tx) => {
      await tx
        .select({ id: workoutAssignments.id })
        .from(workoutAssignments)
        .where(eq(workoutAssignments.id, id))
        .for('update');
      reportLockReady();
      await lockReleased;
    });
    await lockReady;

    const editPromise = request(app.getHttpServer())
      .patch(`/workout-assignments/${id}`)
      .set('x-dino-preview-role', 'coach')
      .send({ ...input, title: 'Race workout edited' })
      .then((response) => response);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const completionPromise = request(app.getHttpServer())
      .post(`/workout-assignments/${id}/complete`)
      .set('x-dino-preview-role', 'athlete')
      .send({ note: 'Race completion' })
      .then((response) => response);
    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseLock();
    await blocker;
    const [edit, completion] = await Promise.all([
      editPromise,
      completionPromise,
    ]);

    const statuses = [edit.status, completion.status];
    expect(
      statuses.filter((status) => status >= 200 && status < 300),
    ).toHaveLength(1);
    expect(statuses).toContain(409);
  });
});
