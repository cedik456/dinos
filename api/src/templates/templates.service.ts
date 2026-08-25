import { HttpStatus, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  referenceExercises,
  workoutTemplateExercises,
  workoutTemplates,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { IdentityException } from '../identity/identity-errors';
import { decodeTemplateCursor, encodeTemplateCursor } from './template-cursor';
import type {
  PageDto,
  ReferenceExerciseDto,
  TemplateActor,
  TemplateCreateInput,
  TemplateListInput,
  WorkoutTemplateDto,
} from './template.types';

function templateError(
  code: ConstructorParameters<typeof IdentityException>[0],
  status: HttpStatus,
  message: string,
): never {
  throw new IdentityException(code, status, message);
}

@Injectable()
export class TemplatesService {
  constructor(private readonly database: DatabaseService) {}

  async listExercises(
    actor: TemplateActor,
    input: TemplateListInput,
  ): Promise<PageDto<ReferenceExerciseDto>> {
    this.requireCoach(actor);
    const kind = 'exercises' as const;
    const offset = decodeTemplateCursor(input.cursor, {
      actorId: actor.id,
      kind,
      query: input.query,
    });
    const rows = await this.database.client
      .select()
      .from(referenceExercises)
      .where(
        input.query
          ? ilike(referenceExercises.name, `%${input.query}%`)
          : undefined,
      )
      .orderBy(asc(referenceExercises.name), asc(referenceExercises.id))
      .offset(offset)
      .limit(input.limit + 1);
    const hasMore = rows.length > input.limit;
    return {
      items: rows.slice(0, input.limit).map((row) => ({
        id: row.id,
        name: row.name,
        defaultSets: row.defaultSets,
        defaultRepetitions: row.defaultRepetitions,
        instruction: row.instruction,
      })),
      nextCursor: hasMore
        ? encodeTemplateCursor({
            actorId: actor.id,
            kind,
            query: input.query,
            offset: offset + input.limit,
          })
        : null,
    };
  }

  async listTemplates(
    actor: TemplateActor,
    input: TemplateListInput,
  ): Promise<PageDto<WorkoutTemplateDto>> {
    this.requireCoach(actor);
    const kind = 'templates' as const;
    const offset = decodeTemplateCursor(input.cursor, {
      actorId: actor.id,
      kind,
      query: '',
    });
    const rows = await this.database.client
      .select()
      .from(workoutTemplates)
      .where(
        or(
          isNull(workoutTemplates.coachAccountId),
          eq(workoutTemplates.coachAccountId, actor.id),
        ),
      )
      .orderBy(
        asc(
          sql`case when ${workoutTemplates.coachAccountId} is null then 0 else 1 end`,
        ),
        asc(workoutTemplates.name),
        asc(workoutTemplates.id),
      )
      .offset(offset)
      .limit(input.limit + 1);
    const pageRows = rows.slice(0, input.limit);
    const items = await this.toTemplateDtos(pageRows);
    return {
      items,
      nextCursor:
        rows.length > input.limit
          ? encodeTemplateCursor({
              actorId: actor.id,
              kind,
              query: '',
              offset: offset + input.limit,
            })
          : null,
    };
  }

  async create(
    actor: TemplateActor,
    input: TemplateCreateInput,
  ): Promise<WorkoutTemplateDto> {
    this.requireCoach(actor);
    const referenceIds = input.exercises.map(
      (exercise) => exercise.referenceExerciseId,
    );
    const references = await this.database.client
      .select({ id: referenceExercises.id })
      .from(referenceExercises)
      .where(inArray(referenceExercises.id, referenceIds));
    if (references.length !== referenceIds.length) {
      return templateError(
        'VALIDATION_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'One or more selected exercises are unavailable.',
      );
    }

    const templateId = await this.database.client.transaction(async (tx) => {
      const [template] = await tx
        .insert(workoutTemplates)
        .values({
          coachAccountId: actor.id,
          name: input.name,
          overviewNote: input.overviewNote,
        })
        .returning({ id: workoutTemplates.id });
      await tx.insert(workoutTemplateExercises).values(
        input.exercises.map((exercise, index) => ({
          templateId: template.id,
          position: index + 1,
          ...exercise,
        })),
      );
      return template.id;
    });
    const [template] = await this.database.client
      .select()
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.id, templateId),
          eq(workoutTemplates.coachAccountId, actor.id),
        ),
      )
      .limit(1);
    return (await this.toTemplateDtos([template]))[0];
  }

  private requireCoach(actor: TemplateActor) {
    if (actor.role !== 'Coach') {
      return templateError(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Workout templates are available to Coaches only.',
      );
    }
  }

  private async toTemplateDtos(
    templates: Array<typeof workoutTemplates.$inferSelect>,
  ): Promise<WorkoutTemplateDto[]> {
    if (templates.length === 0) return [];
    const templateIds = templates.map((template) => template.id);
    const rows = await this.database.client
      .select({
        exercise: workoutTemplateExercises,
        name: referenceExercises.name,
      })
      .from(workoutTemplateExercises)
      .innerJoin(
        referenceExercises,
        eq(referenceExercises.id, workoutTemplateExercises.referenceExerciseId),
      )
      .where(inArray(workoutTemplateExercises.templateId, templateIds))
      .orderBy(
        asc(workoutTemplateExercises.templateId),
        asc(workoutTemplateExercises.position),
      );
    return templates.map((template) => {
      const exercises = rows
        .filter((row) => row.exercise.templateId === template.id)
        .map((row) => ({
          id: row.exercise.id,
          referenceExerciseId: row.exercise.referenceExerciseId,
          position: row.exercise.position,
          name: row.name,
          sets: row.exercise.sets,
          repetitions: row.exercise.repetitions,
          instruction: row.exercise.instruction,
        }));
      return {
        id: template.id,
        scope: template.coachAccountId ? 'Coach' : 'Dino',
        name: template.name,
        overviewNote: template.overviewNote,
        exerciseCount: exercises.length,
        exercises,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    });
  }
}
