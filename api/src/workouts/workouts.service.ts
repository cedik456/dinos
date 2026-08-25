import { HttpStatus, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  accounts,
  assignmentExercises,
  coachingRelationships,
  workoutAssignments,
  workoutCompletions,
  workoutReviews,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { IdentityException } from '../identity/identity-errors';
import {
  decodeWorkoutCursor,
  encodeWorkoutCursor,
  workoutFilterFingerprint,
} from './workout-cursor';
import { PREVIEW_ATHLETE_ID, PREVIEW_COACH_ID } from './workout-actor.guard';
import type {
  WorkoutActor,
  WorkoutAssignmentDetailDto,
  WorkoutAssignmentPageDto,
  WorkoutAssignmentSummaryDto,
  WorkoutListFilters,
  WorkoutUpsertInput,
} from './workout.types';
import { dateInTimeZone, sameWorkoutContent } from './workout-validation';

type AssignmentRow = typeof workoutAssignments.$inferSelect;
type ExerciseRow = typeof assignmentExercises.$inferSelect;

const coachAccount = alias(accounts, 'workout_coach');
const athleteAccount = alias(accounts, 'workout_athlete');

function workoutError(
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
export class WorkoutsService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    actor: WorkoutActor,
    input: WorkoutUpsertInput,
  ): Promise<WorkoutAssignmentDetailDto> {
    if (actor.role !== 'Coach') {
      return workoutError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only a Coach can create a workout.',
      );
    }
    const athleteAccountId =
      actor.id === PREVIEW_COACH_ID
        ? PREVIEW_ATHLETE_ID
        : input.athleteAccountId;
    if (!athleteAccountId) {
      return workoutError(
        'ROSTER_REQUIRED',
        HttpStatus.CONFLICT,
        'Select an active roster Athlete before assignment.',
      );
    }
    if (actor.id !== PREVIEW_COACH_ID) {
      const [relationship] = await this.database.client
        .select({ id: coachingRelationships.id })
        .from(coachingRelationships)
        .where(
          and(
            eq(coachingRelationships.coachAccountId, actor.id),
            eq(coachingRelationships.athleteAccountId, athleteAccountId),
            eq(coachingRelationships.status, 'active'),
          ),
        )
        .limit(1);
      if (!relationship) {
        return workoutError(
          'ROSTER_REQUIRED',
          HttpStatus.CONFLICT,
          'An active roster relationship is required before assignment.',
        );
      }
    }
    const timeZone = input.creationTimeZone!;
    if (input.assignedDate < dateInTimeZone(new Date(), timeZone)) {
      return workoutError(
        'VALIDATION_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'assignedDate cannot be before today.',
      );
    }

    let assignmentId: string;
    try {
      assignmentId = await this.database.client.transaction(async (tx) => {
        const [assignment] = await tx
          .insert(workoutAssignments)
          .values({
            coachAccountId: actor.id,
            athleteAccountId,
            title: input.title,
            overviewNote: input.overviewNote,
            assignedDate: input.assignedDate,
            creationTimeZone: timeZone,
          })
          .returning({ id: workoutAssignments.id });
        await tx.insert(assignmentExercises).values(
          input.exercises.map((exercise, index) => ({
            assignmentId: assignment.id,
            position: index + 1,
            ...exercise,
          })),
        );
        return assignment.id;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const [existing] = await this.database.client
        .select()
        .from(workoutAssignments)
        .where(
          and(
            eq(workoutAssignments.athleteAccountId, athleteAccountId),
            eq(workoutAssignments.assignedDate, input.assignedDate),
          ),
        )
        .limit(1);
      if (existing) {
        const exercises = await this.loadExercises(existing.id);
        if (sameWorkoutContent(existing, exercises, input)) {
          return this.getDetail(actor, existing.id);
        }
      }
      return workoutError(
        'WORKOUT_DATE_TAKEN',
        HttpStatus.CONFLICT,
        'This Athlete already has a workout on that date.',
      );
    }
    return this.getDetail(actor, assignmentId);
  }

  async list(
    actor: WorkoutActor,
    filters: WorkoutListFilters,
  ): Promise<WorkoutAssignmentPageDto> {
    if (filters.awaitingReview && actor.role !== 'Coach') {
      return workoutError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Awaiting review is available to Coaches only.',
      );
    }
    const fingerprint = workoutFilterFingerprint(actor, filters);
    const cursorOrder = filters.cursor
      ? decodeWorkoutCursor(
          filters.cursor,
          fingerprint,
          filters.awaitingReview ? 2 : 3,
        )
      : null;
    const conditions: SQL[] = [
      actor.role === 'Coach'
        ? eq(workoutAssignments.coachAccountId, actor.id)
        : eq(workoutAssignments.athleteAccountId, actor.id),
    ];
    if (filters.status) {
      conditions.push(eq(workoutAssignments.status, filters.status));
    }
    if (filters.dateFrom) {
      conditions.push(gte(workoutAssignments.assignedDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(workoutAssignments.assignedDate, filters.dateTo));
    }
    const currentDate = sql`(current_timestamp at time zone ${workoutAssignments.creationTimeZone})::date`;
    if (filters.relative === 'today') {
      conditions.push(sql`${workoutAssignments.assignedDate} = ${currentDate}`);
    } else if (filters.relative === 'upcoming') {
      conditions.push(sql`${workoutAssignments.assignedDate} > ${currentDate}`);
    } else if (filters.relative === 'past') {
      conditions.push(sql`${workoutAssignments.assignedDate} < ${currentDate}`);
    }
    if (filters.awaitingReview) {
      conditions.push(eq(workoutAssignments.status, 'completed'));
      if (cursorOrder) {
        conditions.push(
          sql`(${workoutCompletions.completedAt}, ${workoutAssignments.id}) > (${cursorOrder[0]}::timestamptz, ${cursorOrder[1]}::uuid)`,
        );
      }
    } else if (cursorOrder) {
      const compare = filters.direction === 'asc' ? gt : lt;
      conditions.push(
        or(
          compare(workoutAssignments.assignedDate, cursorOrder[0]),
          and(
            eq(workoutAssignments.assignedDate, cursorOrder[0]),
            filters.direction === 'asc'
              ? sql`${workoutAssignments.createdAt} > ${cursorOrder[1]}::timestamptz`
              : sql`${workoutAssignments.createdAt} < ${cursorOrder[1]}::timestamptz`,
          ),
          and(
            eq(workoutAssignments.assignedDate, cursorOrder[0]),
            sql`${workoutAssignments.createdAt} = ${cursorOrder[1]}::timestamptz`,
            compare(workoutAssignments.id, cursorOrder[2]),
          ),
        )!,
      );
    }

    const direction = filters.direction === 'asc' ? asc : desc;
    const rows = await this.database.client
      .select({
        assignment: workoutAssignments,
        coachName: coachAccount.displayName,
        athleteName: athleteAccount.displayName,
        exerciseCount: sql<number>`(
          select count(*)::int from assignment_exercises
          where assignment_id = ${workoutAssignments.id}
        )`,
        completedAt: workoutCompletions.completedAt,
        completedAtCursor: sql<string>`${workoutCompletions.completedAt}::text`,
        reviewedAt: workoutReviews.reviewedAt,
        assignmentCreatedAtCursor: sql<string>`${workoutAssignments.createdAt}::text`,
      })
      .from(workoutAssignments)
      .innerJoin(
        coachAccount,
        eq(coachAccount.id, workoutAssignments.coachAccountId),
      )
      .innerJoin(
        athleteAccount,
        eq(athleteAccount.id, workoutAssignments.athleteAccountId),
      )
      .leftJoin(
        workoutCompletions,
        eq(workoutCompletions.assignmentId, workoutAssignments.id),
      )
      .leftJoin(
        workoutReviews,
        eq(workoutReviews.assignmentId, workoutAssignments.id),
      )
      .where(and(...conditions))
      .orderBy(
        ...(filters.awaitingReview
          ? [asc(workoutCompletions.completedAt), asc(workoutAssignments.id)]
          : [
              direction(workoutAssignments.assignedDate),
              direction(workoutAssignments.createdAt),
              direction(workoutAssignments.id),
            ]),
      )
      .limit(filters.limit + 1);

    const pageRows = rows.slice(0, filters.limit);
    const items = pageRows.map((row) =>
      this.toSummary(
        actor,
        row.assignment,
        row.coachName,
        row.athleteName,
        row.exerciseCount,
        row.completedAt,
        row.reviewedAt,
      ),
    );
    const last = pageRows.at(-1);
    const nextCursor =
      rows.length > filters.limit && last
        ? encodeWorkoutCursor(
            fingerprint,
            filters.awaitingReview
              ? [last.completedAtCursor, last.assignment.id]
              : [
                  last.assignment.assignedDate,
                  last.assignmentCreatedAtCursor,
                  last.assignment.id,
                ],
          )
        : null;
    return { items, nextCursor };
  }

  async getDetail(
    actor: WorkoutActor,
    assignmentId: string,
  ): Promise<WorkoutAssignmentDetailDto> {
    const row = await this.loadOwnedAssignment(actor, assignmentId);
    if (!row) {
      return workoutError(
        'WORKOUT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Workout assignment not found.',
      );
    }
    const [exercises, completion, review] = await Promise.all([
      this.loadExercises(assignmentId),
      this.database.client
        .select()
        .from(workoutCompletions)
        .where(eq(workoutCompletions.assignmentId, assignmentId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      this.database.client
        .select()
        .from(workoutReviews)
        .where(eq(workoutReviews.assignmentId, assignmentId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);
    const summary = this.toSummary(
      actor,
      row.assignment,
      row.coachName,
      row.athleteName,
      exercises.length,
      completion?.completedAt ?? null,
      review?.reviewedAt ?? null,
    );
    return {
      ...summary,
      overviewNote: row.assignment.overviewNote,
      creationTimeZone: row.assignment.creationTimeZone,
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        position: exercise.position,
        name: exercise.name,
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        instruction: exercise.instruction,
      })),
      completion: completion
        ? {
            note: completion.note,
            completedAt: completion.completedAt.toISOString(),
          }
        : null,
      review: review
        ? {
            response: review.response,
            reviewedAt: review.reviewedAt.toISOString(),
          }
        : null,
    };
  }

  async edit(
    actor: WorkoutActor,
    assignmentId: string,
    input: WorkoutUpsertInput,
  ): Promise<WorkoutAssignmentDetailDto> {
    if (actor.role !== 'Coach') {
      return workoutError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only a Coach can edit a workout.',
      );
    }
    const expectedVersion = await this.loadMutationVersion(actor, assignmentId);
    if (!expectedVersion) {
      return workoutError(
        'WORKOUT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Workout assignment not found.',
      );
    }
    try {
      await this.database.client.transaction(async (tx) => {
        const [locked] = await tx
          .select({
            assignment: workoutAssignments,
            version: sql<string>`xmin::text`,
          })
          .from(workoutAssignments)
          .where(
            and(
              eq(workoutAssignments.id, assignmentId),
              eq(workoutAssignments.coachAccountId, actor.id),
            ),
          )
          .for('update')
          .limit(1);
        const assignment = locked?.assignment;
        if (!assignment) {
          return workoutError(
            'WORKOUT_NOT_FOUND',
            HttpStatus.NOT_FOUND,
            'Workout assignment not found.',
          );
        }
        if (locked.version !== expectedVersion) {
          return workoutError(
            'WORKOUT_STATE_CONFLICT',
            HttpStatus.CONFLICT,
            'This workout changed state. Refresh before continuing.',
          );
        }
        const exercises = await tx
          .select()
          .from(assignmentExercises)
          .where(eq(assignmentExercises.assignmentId, assignmentId))
          .orderBy(asc(assignmentExercises.position));
        if (sameWorkoutContent(assignment, exercises, input)) return;
        if (assignment.status !== 'assigned') {
          return workoutError(
            'WORKOUT_STATE_CONFLICT',
            HttpStatus.CONFLICT,
            'This workout changed state. Refresh before continuing.',
          );
        }
        if (
          input.assignedDate <
          dateInTimeZone(new Date(), assignment.creationTimeZone)
        ) {
          return workoutError(
            'VALIDATION_FAILED',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'assignedDate cannot be before today.',
          );
        }
        await tx
          .update(workoutAssignments)
          .set({
            title: input.title,
            overviewNote: input.overviewNote,
            assignedDate: input.assignedDate,
            updatedAt: new Date(),
          })
          .where(eq(workoutAssignments.id, assignmentId));
        await tx
          .delete(assignmentExercises)
          .where(eq(assignmentExercises.assignmentId, assignmentId));
        await tx.insert(assignmentExercises).values(
          input.exercises.map((exercise, index) => ({
            assignmentId,
            position: index + 1,
            ...exercise,
          })),
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return workoutError(
          'WORKOUT_DATE_TAKEN',
          HttpStatus.CONFLICT,
          'This Athlete already has a workout on that date.',
        );
      }
      throw error;
    }
    return this.getDetail(actor, assignmentId);
  }

  async complete(
    actor: WorkoutActor,
    assignmentId: string,
    note: string | null,
  ): Promise<WorkoutAssignmentDetailDto> {
    if (actor.role !== 'Athlete') {
      return workoutError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only the assigned Athlete can complete a workout.',
      );
    }
    const expectedVersion = await this.loadMutationVersion(actor, assignmentId);
    if (!expectedVersion) {
      return workoutError(
        'WORKOUT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Workout assignment not found.',
      );
    }
    await this.database.client.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          assignment: workoutAssignments,
          version: sql<string>`xmin::text`,
        })
        .from(workoutAssignments)
        .where(
          and(
            eq(workoutAssignments.id, assignmentId),
            eq(workoutAssignments.athleteAccountId, actor.id),
          ),
        )
        .for('update')
        .limit(1);
      const assignment = locked?.assignment;
      if (!assignment) {
        return workoutError(
          'WORKOUT_NOT_FOUND',
          HttpStatus.NOT_FOUND,
          'Workout assignment not found.',
        );
      }
      if (locked.version !== expectedVersion) {
        return workoutError(
          'WORKOUT_STATE_CONFLICT',
          HttpStatus.CONFLICT,
          'This workout changed state. Refresh before continuing.',
        );
      }
      const [existing] = await tx
        .select()
        .from(workoutCompletions)
        .where(eq(workoutCompletions.assignmentId, assignmentId))
        .limit(1);
      if (existing) {
        if (existing.note === note) return;
        return workoutError(
          'WORKOUT_RETRY_CONFLICT',
          HttpStatus.CONFLICT,
          'This completion was already saved with different content.',
        );
      }
      if (assignment.status !== 'assigned') {
        return workoutError(
          'WORKOUT_STATE_CONFLICT',
          HttpStatus.CONFLICT,
          'This workout is not available for completion.',
        );
      }
      if (
        assignment.assignedDate >
        dateInTimeZone(new Date(), assignment.creationTimeZone)
      ) {
        return workoutError(
          'WORKOUT_TOO_EARLY',
          HttpStatus.CONFLICT,
          'This workout cannot be completed before its assigned date.',
        );
      }
      await tx.insert(workoutCompletions).values({
        assignmentId,
        athleteAccountId: actor.id,
        note,
      });
      await tx
        .update(workoutAssignments)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(workoutAssignments.id, assignmentId));
    });
    return this.getDetail(actor, assignmentId);
  }

  async review(
    actor: WorkoutActor,
    assignmentId: string,
    response: string | null,
  ): Promise<WorkoutAssignmentDetailDto> {
    if (actor.role !== 'Coach') {
      return workoutError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only the owning Coach can review a workout.',
      );
    }
    await this.database.client.transaction(async (tx) => {
      const [assignment] = await tx
        .select()
        .from(workoutAssignments)
        .where(
          and(
            eq(workoutAssignments.id, assignmentId),
            eq(workoutAssignments.coachAccountId, actor.id),
          ),
        )
        .for('update')
        .limit(1);
      if (!assignment) {
        return workoutError(
          'WORKOUT_NOT_FOUND',
          HttpStatus.NOT_FOUND,
          'Workout assignment not found.',
        );
      }
      const [existing] = await tx
        .select()
        .from(workoutReviews)
        .where(eq(workoutReviews.assignmentId, assignmentId))
        .limit(1);
      if (existing) {
        if (existing.response === response) return;
        return workoutError(
          'WORKOUT_RETRY_CONFLICT',
          HttpStatus.CONFLICT,
          'This review was already saved with different content.',
        );
      }
      if (assignment.status !== 'completed') {
        return workoutError(
          'WORKOUT_STATE_CONFLICT',
          HttpStatus.CONFLICT,
          'This workout is not ready for review.',
        );
      }
      await tx.insert(workoutReviews).values({
        assignmentId,
        coachAccountId: actor.id,
        response,
      });
      await tx
        .update(workoutAssignments)
        .set({ status: 'reviewed', updatedAt: new Date() })
        .where(eq(workoutAssignments.id, assignmentId));
    });
    return this.getDetail(actor, assignmentId);
  }

  private async loadOwnedAssignment(actor: WorkoutActor, assignmentId: string) {
    const [row] = await this.database.client
      .select({
        assignment: workoutAssignments,
        coachName: coachAccount.displayName,
        athleteName: athleteAccount.displayName,
      })
      .from(workoutAssignments)
      .innerJoin(
        coachAccount,
        eq(coachAccount.id, workoutAssignments.coachAccountId),
      )
      .innerJoin(
        athleteAccount,
        eq(athleteAccount.id, workoutAssignments.athleteAccountId),
      )
      .where(
        and(
          eq(workoutAssignments.id, assignmentId),
          actor.role === 'Coach'
            ? eq(workoutAssignments.coachAccountId, actor.id)
            : eq(workoutAssignments.athleteAccountId, actor.id),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async loadMutationVersion(
    actor: WorkoutActor,
    assignmentId: string,
  ): Promise<string | null> {
    const [row] = await this.database.client
      .select({ version: sql<string>`xmin::text` })
      .from(workoutAssignments)
      .where(
        and(
          eq(workoutAssignments.id, assignmentId),
          actor.role === 'Coach'
            ? eq(workoutAssignments.coachAccountId, actor.id)
            : eq(workoutAssignments.athleteAccountId, actor.id),
        ),
      )
      .limit(1);
    return row?.version ?? null;
  }

  private loadExercises(assignmentId: string): Promise<ExerciseRow[]> {
    return this.database.client
      .select()
      .from(assignmentExercises)
      .where(eq(assignmentExercises.assignmentId, assignmentId))
      .orderBy(asc(assignmentExercises.position));
  }

  private toSummary(
    actor: WorkoutActor,
    assignment: AssignmentRow,
    coachName: string,
    athleteName: string,
    exerciseCount: number,
    completedAt: Date | null,
    reviewedAt: Date | null,
  ): WorkoutAssignmentSummaryDto {
    const today = dateInTimeZone(new Date(), assignment.creationTimeZone);
    const dateRelation =
      assignment.assignedDate < today
        ? 'past'
        : assignment.assignedDate > today
          ? 'future'
          : 'today';
    return {
      id: assignment.id,
      title: assignment.title,
      assignedDate: assignment.assignedDate,
      dateRelation,
      status: assignment.status,
      coach: { id: assignment.coachAccountId, displayName: coachName },
      athlete: { id: assignment.athleteAccountId, displayName: athleteName },
      exerciseCount,
      completedAt: completedAt?.toISOString() ?? null,
      reviewedAt: reviewedAt?.toISOString() ?? null,
      awaitingReview: assignment.status === 'completed',
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
      actions: {
        canEdit: actor.role === 'Coach' && assignment.status === 'assigned',
        canComplete:
          actor.role === 'Athlete' &&
          assignment.status === 'assigned' &&
          dateRelation !== 'future',
        canReview: actor.role === 'Coach' && assignment.status === 'completed',
      },
    };
  }
}
