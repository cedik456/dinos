import { HttpStatus, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  accounts,
  coachingRelationships,
  workoutAssignments,
  workoutCompletions,
  workoutReviews,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { IdentityException } from '../identity/identity-errors';
import {
  PREVIEW_ATHLETE_ID,
  PREVIEW_COACH_ID,
} from '../workouts/workout-actor.guard';
import {
  addCalendarDays,
  buildAthleteWeek,
  summarizeWeek,
} from './weekly-progress-calculation';
import {
  decodeWeeklyCursor,
  encodeWeeklyCursor,
} from './weekly-progress-cursor';
import type {
  WeeklyAssignmentRow,
  WeeklyAthleteDetailDto,
  WeeklyCoachOverviewDto,
  WeeklyCoachRowDto,
  WeeklyProgressActor,
  WeeklyProgressInput,
} from './weekly-progress.types';
import { dateInTimeZone } from '../workouts/workout-validation';

const rosterAthlete = alias(accounts, 'weekly_roster_athlete');

function weeklyError(
  code: ConstructorParameters<typeof IdentityException>[0],
  status: HttpStatus,
  message: string,
): never {
  throw new IdentityException(code, status, message);
}

@Injectable()
export class WeeklyProgressService {
  constructor(private readonly database: DatabaseService) {}

  async getForActor(
    actor: WeeklyProgressActor,
    input: WeeklyProgressInput,
  ): Promise<WeeklyAthleteDetailDto | WeeklyCoachOverviewDto> {
    if (actor.role === 'Athlete') {
      return this.loadAthleteDetail(
        { id: actor.id, displayName: actor.displayName },
        input,
      );
    }
    return this.loadCoachOverview(actor, input);
  }

  async getAthleteForCoach(
    actor: WeeklyProgressActor,
    athleteAccountId: string,
    input: WeeklyProgressInput,
  ): Promise<WeeklyAthleteDetailDto> {
    if (actor.role !== 'Coach') {
      return weeklyError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only a Coach can open an Athlete weekly record.',
      );
    }
    const athlete = await this.loadOwnedAthlete(actor.id, athleteAccountId);
    if (!athlete) {
      return weeklyError(
        'WORKOUT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Athlete weekly progress not found.',
      );
    }
    return this.loadAthleteDetail(athlete, input);
  }

  private async loadCoachOverview(
    actor: WeeklyProgressActor,
    input: WeeklyProgressInput,
  ): Promise<WeeklyCoachOverviewDto> {
    const athletes = await this.loadRoster(actor.id);
    const assignments = await this.loadAssignments(
      athletes.map((athlete) => athlete.id),
      input.weekStart,
      addCalendarDays(input.weekStart, 6),
    );
    const today = dateInTimeZone(new Date(), input.timeZone);
    const byAthlete = new Map<string, WeeklyAssignmentRow[]>();
    for (const assignment of assignments) {
      const values = byAthlete.get(assignment.athleteAccountId) ?? [];
      values.push(assignment);
      byAthlete.set(assignment.athleteAccountId, values);
    }

    const rows: WeeklyCoachRowDto[] = athletes.map((athlete) => ({
      athlete,
      summary: summarizeWeek(byAthlete.get(athlete.id) ?? [], today),
    }));
    rows.sort((left, right) => {
      const awaiting =
        right.summary.awaitingReviewCount - left.summary.awaitingReviewCount;
      if (awaiting) return awaiting;
      const missed = right.summary.missedCount - left.summary.missedCount;
      if (missed) return missed;
      const leftProgress =
        left.summary.progressPercent ?? Number.POSITIVE_INFINITY;
      const rightProgress =
        right.summary.progressPercent ?? Number.POSITIVE_INFINITY;
      if (leftProgress !== rightProgress) return leftProgress - rightProgress;
      const name = left.athlete.displayName.localeCompare(
        right.athlete.displayName,
        undefined,
        { sensitivity: 'base' },
      );
      return name || left.athlete.id.localeCompare(right.athlete.id);
    });

    let startIndex = 0;
    if (input.cursor) {
      const cursor = decodeWeeklyCursor(input.cursor, {
        coachId: actor.id,
        weekStart: input.weekStart,
        timeZone: input.timeZone,
      });
      const cursorIndex = rows.findIndex(
        (row) => row.athlete.id === cursor.athleteId,
      );
      if (cursorIndex < 0) {
        return weeklyError(
          'VALIDATION_FAILED',
          HttpStatus.UNPROCESSABLE_ENTITY,
          'cursor is invalid.',
        );
      }
      startIndex = cursorIndex + 1;
    }

    const items = rows.slice(startIndex, startIndex + input.limit);
    const hasMore = startIndex + input.limit < rows.length;
    const last = items.at(-1);
    return {
      kind: 'coach',
      week: {
        startDate: input.weekStart,
        endDate: addCalendarDays(input.weekStart, 6),
        timeZone: input.timeZone,
      },
      summary: {
        ...summarizeWeek(assignments, today),
        activeAthleteCount: athletes.length,
      },
      items,
      nextCursor:
        hasMore && last
          ? encodeWeeklyCursor({
              coachId: actor.id,
              weekStart: input.weekStart,
              timeZone: input.timeZone,
              athleteId: last.athlete.id,
            })
          : null,
    };
  }

  private async loadAthleteDetail(
    athlete: { id: string; displayName: string },
    input: WeeklyProgressInput,
  ): Promise<WeeklyAthleteDetailDto> {
    const assignments = await this.loadAssignments(
      [athlete.id],
      input.weekStart,
      addCalendarDays(input.weekStart, 6),
    );
    return buildAthleteWeek(
      athlete,
      input,
      assignments,
      dateInTimeZone(new Date(), input.timeZone),
    );
  }

  private async loadRoster(
    coachAccountId: string,
  ): Promise<Array<{ id: string; displayName: string }>> {
    if (coachAccountId === PREVIEW_COACH_ID) {
      const [athlete] = await this.database.client
        .select({ id: accounts.id, displayName: accounts.displayName })
        .from(accounts)
        .where(eq(accounts.id, PREVIEW_ATHLETE_ID))
        .limit(1);
      return athlete ? [athlete] : [];
    }
    return this.database.client
      .select({ id: rosterAthlete.id, displayName: rosterAthlete.displayName })
      .from(coachingRelationships)
      .innerJoin(
        rosterAthlete,
        eq(rosterAthlete.id, coachingRelationships.athleteAccountId),
      )
      .where(
        and(
          eq(coachingRelationships.coachAccountId, coachAccountId),
          eq(coachingRelationships.status, 'active'),
          eq(rosterAthlete.role, 'Athlete'),
          eq(rosterAthlete.status, 'active'),
        ),
      )
      .orderBy(asc(rosterAthlete.displayName), asc(rosterAthlete.id));
  }

  private async loadOwnedAthlete(
    coachAccountId: string,
    athleteAccountId: string,
  ): Promise<{ id: string; displayName: string } | null> {
    if (
      coachAccountId === PREVIEW_COACH_ID &&
      athleteAccountId === PREVIEW_ATHLETE_ID
    ) {
      const [athlete] = await this.database.client
        .select({ id: accounts.id, displayName: accounts.displayName })
        .from(accounts)
        .where(eq(accounts.id, PREVIEW_ATHLETE_ID))
        .limit(1);
      return athlete ?? null;
    }
    const [athlete] = await this.database.client
      .select({ id: rosterAthlete.id, displayName: rosterAthlete.displayName })
      .from(coachingRelationships)
      .innerJoin(
        rosterAthlete,
        eq(rosterAthlete.id, coachingRelationships.athleteAccountId),
      )
      .where(
        and(
          eq(coachingRelationships.coachAccountId, coachAccountId),
          eq(coachingRelationships.athleteAccountId, athleteAccountId),
          eq(coachingRelationships.status, 'active'),
          eq(rosterAthlete.role, 'Athlete'),
          eq(rosterAthlete.status, 'active'),
        ),
      )
      .limit(1);
    return athlete ?? null;
  }

  private async loadAssignments(
    athleteIds: string[],
    weekStart: string,
    weekEnd: string,
  ): Promise<WeeklyAssignmentRow[]> {
    if (athleteIds.length === 0) return [];
    return this.database.client
      .select({
        id: workoutAssignments.id,
        athleteAccountId: workoutAssignments.athleteAccountId,
        title: workoutAssignments.title,
        assignedDate: workoutAssignments.assignedDate,
        status: workoutAssignments.status,
        completedAt: workoutCompletions.completedAt,
        reviewedAt: workoutReviews.reviewedAt,
      })
      .from(workoutAssignments)
      .leftJoin(
        workoutCompletions,
        eq(workoutCompletions.assignmentId, workoutAssignments.id),
      )
      .leftJoin(
        workoutReviews,
        eq(workoutReviews.assignmentId, workoutAssignments.id),
      )
      .where(
        and(
          inArray(workoutAssignments.athleteAccountId, athleteIds),
          gte(workoutAssignments.assignedDate, weekStart),
          lte(workoutAssignments.assignedDate, weekEnd),
        ),
      )
      .orderBy(
        asc(workoutAssignments.assignedDate),
        asc(workoutAssignments.id),
      );
  }
}
