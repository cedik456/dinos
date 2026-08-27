import { HttpStatus, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DatabaseService } from '../database/database.service';
import {
  accounts,
  coachingRelationships,
  mealRecommendationItems,
  mealRecommendationMeals,
  mealRecommendationPlans,
} from '../database/schema';
import { IdentityException } from '../identity/identity-errors';
import { addCalendarDays } from '../weekly-progress/weekly-progress-calculation';
import { dateInTimeZone } from '../workouts/workout-validation';
import type {
  AthleteMealRecommendationsDto,
  CoachMealRecommendationsDto,
  MealKind,
  MealRecommendationDayDto,
  MealRecommendationDeleteInput,
  MealRecommendationMealDto,
  MealRecommendationsActor,
  MealRecommendationsQuery,
  MealRecommendationSaveInput,
} from './meal-recommendations.types';

const mealAthlete = alias(accounts, 'meal_athlete');
const mealCoach = alias(accounts, 'meal_coach');

type RelationshipRow = {
  id: string;
  coachAccountId: string;
  coachDisplayName: string;
  startedAt: Date;
  endedAt: Date | null;
};

type PlanBundle = {
  id: string;
  coachingRelationshipId: string;
  version: number;
  mealsByDay: Map<number, MealRecommendationMealDto[]>;
};

const MEAL_LABELS: Record<Exclude<MealKind, 'custom'>, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

function mealError(
  code: ConstructorParameters<typeof IdentityException>[0],
  status: HttpStatus,
  message: string,
): never {
  throw new IdentityException(code, status, message);
}

function mondayFor(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (date.getUTCDay() + 6) % 7;
  return addCalendarDays(value, -offset);
}

function localDateTimeToUtc(date: string, timeZone: string, hour = 0): Date {
  const [year, month, day] = date.split('-').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour);
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .map((part) => [part.type, part.value]),
    );
    const actual = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate += desired - actual;
  }
  return new Date(candidate);
}

function relationshipForDay(
  relationships: RelationshipRow[],
  date: string,
  timeZone: string,
): RelationshipRow | null {
  const start = localDateTimeToUtc(date, timeZone);
  const end = localDateTimeToUtc(addCalendarDays(date, 1), timeZone);
  return (
    relationships
      .filter(
        (relationship) =>
          relationship.startedAt < end &&
          (!relationship.endedAt || relationship.endedAt >= start),
      )
      .sort(
        (left, right) => right.startedAt.getTime() - left.startedAt.getTime(),
      )[0] ?? null
  );
}

function displayMealName(kind: MealKind, customName: string | null): string {
  return kind === 'custom' ? customName! : MEAL_LABELS[kind];
}

function displayAmount(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

@Injectable()
export class MealRecommendationsService {
  constructor(private readonly database: DatabaseService) {}

  async getForAthlete(
    actor: MealRecommendationsActor,
    input: MealRecommendationsQuery,
  ): Promise<AthleteMealRecommendationsDto> {
    if (actor.role !== 'Athlete') {
      return mealError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only an Athlete can open personal meal recommendations.',
      );
    }
    const relationships = await this.loadAthleteRelationships(actor.id);
    const bundles = await this.loadPlanBundles(
      relationships.map((relationship) => relationship.id),
      input.weekStart,
    );
    const plansByRelationship = new Map(
      bundles.map((bundle) => [bundle.coachingRelationshipId, bundle]),
    );
    const days = Array.from({ length: 7 }, (_, dayOffset) => {
      const date = addCalendarDays(input.weekStart, dayOffset);
      const relationship = relationshipForDay(
        relationships,
        date,
        input.timeZone,
      );
      const plan = relationship
        ? plansByRelationship.get(relationship.id)
        : undefined;
      const meals = plan?.mealsByDay.get(dayOffset) ?? [];
      return this.day(
        date,
        dayOffset,
        meals,
        meals.length > 0 ? (relationship?.coachDisplayName ?? null) : null,
        meals.length > 0 ? (plan?.version ?? null) : null,
      );
    });
    return {
      kind: 'athlete',
      week: this.week(input),
      athlete: { id: actor.id, displayName: actor.displayName },
      days,
    };
  }

  async getForCoach(
    actor: MealRecommendationsActor,
    athleteAccountId: string,
    input: MealRecommendationsQuery,
  ): Promise<CoachMealRecommendationsDto> {
    this.requireCoach(actor);
    const relationship = await this.loadActiveRelationship(
      actor.id,
      athleteAccountId,
    );
    if (!relationship) return this.notFound();
    const [plan] = await this.loadPlanBundles(
      [relationship.id],
      input.weekStart,
    );
    return this.coachDto(actor, relationship, plan, input);
  }

  async saveForCoach(
    actor: MealRecommendationsActor,
    athleteAccountId: string,
    input: MealRecommendationSaveInput,
  ): Promise<CoachMealRecommendationsDto> {
    this.requireCoach(actor);
    this.requireEditable(input.weekStart, input.timeZone);
    await this.database.client.transaction(async (tx) => {
      const [relationship] = await tx
        .select({ id: coachingRelationships.id })
        .from(coachingRelationships)
        .where(
          and(
            eq(coachingRelationships.coachAccountId, actor.id),
            eq(coachingRelationships.athleteAccountId, athleteAccountId),
            eq(coachingRelationships.status, 'active'),
          ),
        )
        .for('update')
        .limit(1);
      if (!relationship) return this.notFound();

      const [athlete] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, athleteAccountId),
            eq(accounts.role, 'Athlete'),
            eq(accounts.status, 'active'),
          ),
        )
        .limit(1);
      if (!athlete) return this.notFound();

      const [existing] = await tx
        .select()
        .from(mealRecommendationPlans)
        .where(
          and(
            eq(mealRecommendationPlans.coachingRelationshipId, relationship.id),
            eq(mealRecommendationPlans.weekStart, input.weekStart),
          ),
        )
        .for('update')
        .limit(1);

      let planId: string;
      if (existing) {
        if (input.expectedVersion !== existing.version) return this.conflict();
        planId = existing.id;
        await tx
          .update(mealRecommendationPlans)
          .set({ version: existing.version + 1, updatedAt: new Date() })
          .where(eq(mealRecommendationPlans.id, planId));
        await tx
          .delete(mealRecommendationMeals)
          .where(eq(mealRecommendationMeals.planId, planId));
      } else {
        if (input.expectedVersion !== null) return this.conflict();
        const [created] = await tx
          .insert(mealRecommendationPlans)
          .values({
            coachingRelationshipId: relationship.id,
            weekStart: input.weekStart,
          })
          .returning({ id: mealRecommendationPlans.id });
        planId = created.id;
      }

      for (const meal of input.meals) {
        const [createdMeal] = await tx
          .insert(mealRecommendationMeals)
          .values({
            planId,
            dayOffset: meal.dayOffset,
            kind: meal.kind,
            customName: meal.customName,
            position: meal.position,
          })
          .returning({ id: mealRecommendationMeals.id });
        if (meal.items.length > 0) {
          await tx.insert(mealRecommendationItems).values(
            meal.items.map((item) => ({
              mealId: createdMeal.id,
              name: item.name,
              amount: item.amount,
              unit: item.unit,
              position: item.position,
            })),
          );
        }
      }
    });
    return this.getForCoach(actor, athleteAccountId, input);
  }

  async deleteForCoach(
    actor: MealRecommendationsActor,
    athleteAccountId: string,
    input: MealRecommendationDeleteInput,
  ): Promise<void> {
    this.requireCoach(actor);
    this.requireEditable(input.weekStart, input.timeZone);
    await this.database.client.transaction(async (tx) => {
      const [relationship] = await tx
        .select({ id: coachingRelationships.id })
        .from(coachingRelationships)
        .where(
          and(
            eq(coachingRelationships.coachAccountId, actor.id),
            eq(coachingRelationships.athleteAccountId, athleteAccountId),
            eq(coachingRelationships.status, 'active'),
          ),
        )
        .for('update')
        .limit(1);
      if (!relationship) return this.notFound();
      const [plan] = await tx
        .select()
        .from(mealRecommendationPlans)
        .where(
          and(
            eq(mealRecommendationPlans.coachingRelationshipId, relationship.id),
            eq(mealRecommendationPlans.weekStart, input.weekStart),
          ),
        )
        .for('update')
        .limit(1);
      if (!plan) return this.notFound();
      if (plan.version !== input.expectedVersion) return this.conflict();
      await tx
        .delete(mealRecommendationPlans)
        .where(eq(mealRecommendationPlans.id, plan.id));
    });
  }

  private async loadActiveRelationship(
    coachAccountId: string,
    athleteAccountId: string,
  ): Promise<
    (RelationshipRow & { athlete: { id: string; displayName: string } }) | null
  > {
    const [row] = await this.database.client
      .select({
        id: coachingRelationships.id,
        coachAccountId: coachingRelationships.coachAccountId,
        coachDisplayName: accounts.displayName,
        startedAt: coachingRelationships.startedAt,
        endedAt: coachingRelationships.endedAt,
        athleteId: mealAthlete.id,
        athleteDisplayName: mealAthlete.displayName,
      })
      .from(coachingRelationships)
      .innerJoin(
        accounts,
        eq(accounts.id, coachingRelationships.coachAccountId),
      )
      .innerJoin(
        mealAthlete,
        eq(mealAthlete.id, coachingRelationships.athleteAccountId),
      )
      .where(
        and(
          eq(coachingRelationships.coachAccountId, coachAccountId),
          eq(coachingRelationships.athleteAccountId, athleteAccountId),
          eq(coachingRelationships.status, 'active'),
          eq(mealAthlete.role, 'Athlete'),
          eq(mealAthlete.status, 'active'),
        ),
      )
      .limit(1);
    return row
      ? {
          id: row.id,
          coachAccountId: row.coachAccountId,
          coachDisplayName: row.coachDisplayName,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          athlete: { id: row.athleteId, displayName: row.athleteDisplayName },
        }
      : null;
  }

  private async loadAthleteRelationships(
    athleteAccountId: string,
  ): Promise<RelationshipRow[]> {
    return this.database.client
      .select({
        id: coachingRelationships.id,
        coachAccountId: coachingRelationships.coachAccountId,
        coachDisplayName: mealCoach.displayName,
        startedAt: coachingRelationships.startedAt,
        endedAt: coachingRelationships.endedAt,
      })
      .from(coachingRelationships)
      .innerJoin(
        mealCoach,
        eq(mealCoach.id, coachingRelationships.coachAccountId),
      )
      .where(eq(coachingRelationships.athleteAccountId, athleteAccountId))
      .orderBy(asc(coachingRelationships.startedAt));
  }

  private async loadPlanBundles(
    relationshipIds: string[],
    weekStart: string,
  ): Promise<PlanBundle[]> {
    if (relationshipIds.length === 0) return [];
    const plans = await this.database.client
      .select()
      .from(mealRecommendationPlans)
      .where(
        and(
          inArray(
            mealRecommendationPlans.coachingRelationshipId,
            relationshipIds,
          ),
          eq(mealRecommendationPlans.weekStart, weekStart),
        ),
      );
    if (plans.length === 0) return [];
    const meals = await this.database.client
      .select()
      .from(mealRecommendationMeals)
      .where(
        inArray(
          mealRecommendationMeals.planId,
          plans.map((plan) => plan.id),
        ),
      )
      .orderBy(
        asc(mealRecommendationMeals.dayOffset),
        asc(mealRecommendationMeals.position),
      );
    const items =
      meals.length === 0
        ? []
        : await this.database.client
            .select()
            .from(mealRecommendationItems)
            .where(
              inArray(
                mealRecommendationItems.mealId,
                meals.map((meal) => meal.id),
              ),
            )
            .orderBy(asc(mealRecommendationItems.position));
    const itemsByMeal = new Map<string, typeof items>();
    for (const item of items) {
      const values = itemsByMeal.get(item.mealId) ?? [];
      values.push(item);
      itemsByMeal.set(item.mealId, values);
    }
    return plans.map((plan) => {
      const mealsByDay = new Map<number, MealRecommendationMealDto[]>();
      for (const meal of meals.filter((value) => value.planId === plan.id)) {
        const values = mealsByDay.get(meal.dayOffset) ?? [];
        values.push({
          id: meal.id,
          dayOffset: meal.dayOffset,
          kind: meal.kind,
          customName: meal.customName,
          position: meal.position,
          displayName: displayMealName(meal.kind, meal.customName),
          items: (itemsByMeal.get(meal.id) ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            amount: displayAmount(item.amount),
            unit: item.unit,
            position: item.position,
          })),
        });
        mealsByDay.set(meal.dayOffset, values);
      }
      return {
        id: plan.id,
        coachingRelationshipId: plan.coachingRelationshipId,
        version: plan.version,
        mealsByDay,
      };
    });
  }

  private coachDto(
    actor: MealRecommendationsActor,
    relationship: RelationshipRow & {
      athlete: { id: string; displayName: string };
    },
    plan: PlanBundle | undefined,
    input: MealRecommendationsQuery,
  ): CoachMealRecommendationsDto {
    return {
      kind: 'coach',
      week: this.week(input),
      athlete: relationship.athlete,
      coachDisplayName: actor.displayName,
      version: plan?.version ?? null,
      editable: this.isEditable(input.weekStart, input.timeZone),
      days: Array.from({ length: 7 }, (_, dayOffset) => {
        const meals = plan?.mealsByDay.get(dayOffset) ?? [];
        return this.day(
          addCalendarDays(input.weekStart, dayOffset),
          dayOffset,
          meals,
          meals.length > 0 ? actor.displayName : null,
          meals.length > 0 ? (plan?.version ?? null) : null,
        );
      }),
    };
  }

  private day(
    date: string,
    dayOffset: number,
    meals: MealRecommendationMealDto[],
    coachDisplayName: string | null,
    sourceVersion: number | null,
  ): MealRecommendationDayDto {
    return { date, dayOffset, coachDisplayName, sourceVersion, meals };
  }

  private week(input: MealRecommendationsQuery) {
    return {
      startDate: input.weekStart,
      endDate: addCalendarDays(input.weekStart, 6),
      timeZone: input.timeZone,
    };
  }

  private isEditable(weekStart: string, timeZone: string): boolean {
    return weekStart >= mondayFor(dateInTimeZone(new Date(), timeZone));
  }

  private requireEditable(weekStart: string, timeZone: string): void {
    if (!this.isEditable(weekStart, timeZone)) {
      return mealError(
        'VALIDATION_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Past meal recommendation weeks are view only.',
      );
    }
  }

  private requireCoach(actor: MealRecommendationsActor): void {
    if (actor.role !== 'Coach') {
      return mealError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Only a Coach can manage Athlete meal recommendations.',
      );
    }
  }

  private conflict(): never {
    return mealError(
      'MEAL_PLAN_CONFLICT',
      HttpStatus.CONFLICT,
      'This meal recommendation week changed. Reload before saving.',
    );
  }

  private notFound(): never {
    return mealError(
      'MEAL_PLAN_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Meal recommendations not found.',
    );
  }
}
