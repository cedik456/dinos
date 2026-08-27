import { HttpStatus, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  coachExerciseVideos,
  referenceExercises,
  workoutTemplateExercises,
  workoutTemplates,
} from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { IdentityException } from '../identity/identity-errors';
import { decodeTemplateCursor, encodeTemplateCursor } from './template-cursor';
import type {
  PageDto,
  ReferenceExercisePageDto,
  TemplateActor,
  TemplateCreateInput,
  TemplateListInput,
  WorkoutTemplateDto,
} from './template.types';
import type {
  ExerciseVideoInput,
  ExerciseVideoPreviewDto,
} from './template.types';
import { parseExerciseVideoUrl } from './exercise-video';

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
  ): Promise<ReferenceExercisePageDto> {
    this.requireCoach(actor);
    const kind = 'exercises' as const;
    const cursorBinding = {
      actorId: actor.id,
      kind,
      query: input.query,
      equipment: input.equipment,
      primaryMuscle: input.primaryMuscle,
    };
    const offset = decodeTemplateCursor(input.cursor, {
      ...cursorBinding,
    });
    const filters = [eq(referenceExercises.catalogStatus, 'active')];
    if (input.query) {
      filters.push(ilike(referenceExercises.name, `%${input.query}%`));
    }
    if (input.equipment) {
      filters.push(eq(referenceExercises.equipment, input.equipment));
    }
    if (input.primaryMuscle) {
      filters.push(eq(referenceExercises.primaryMuscle, input.primaryMuscle));
    }
    const rows = await this.database.client
      .select()
      .from(referenceExercises)
      .where(and(...filters))
      .orderBy(
        asc(sql`lower(${referenceExercises.name})`),
        asc(referenceExercises.id),
      )
      .offset(offset)
      .limit(input.limit + 1);
    const hasMore = rows.length > input.limit;
    const pageRows = rows.slice(0, input.limit);
    const videos = pageRows.length
      ? await this.database.client
          .select()
          .from(coachExerciseVideos)
          .where(
            and(
              eq(coachExerciseVideos.coachAccountId, actor.id),
              inArray(
                coachExerciseVideos.referenceExerciseId,
                pageRows.map((row) => row.id),
              ),
            ),
          )
      : [];
    const videosByReference = new Map(
      videos.map((video) => [video.referenceExerciseId, video]),
    );
    const [equipmentRows, muscleRows] = await Promise.all([
      this.database.client
        .selectDistinct({ value: referenceExercises.equipment })
        .from(referenceExercises)
        .where(eq(referenceExercises.catalogStatus, 'active'))
        .orderBy(asc(referenceExercises.equipment)),
      this.database.client
        .selectDistinct({ value: referenceExercises.primaryMuscle })
        .from(referenceExercises)
        .where(eq(referenceExercises.catalogStatus, 'active'))
        .orderBy(asc(referenceExercises.primaryMuscle)),
    ]);
    return {
      items: pageRows.map((row) => ({
        id: row.id,
        name: row.name,
        exerciseType: row.exerciseType!,
        equipment: row.equipment!,
        primaryMuscle: row.primaryMuscle!,
        secondaryMuscles: row.secondaryMuscles!,
        isStretch: row.isStretch!,
        illustrationFrames: row.illustrationFrames!,
        illustrationAttribution: row.illustrationAttribution!,
        currentVideo: this.toVideoDto(videosByReference.get(row.id) ?? null),
      })),
      nextCursor: hasMore
        ? encodeTemplateCursor({
            ...cursorBinding,
            offset: offset + input.limit,
          })
        : null,
      filters: {
        equipment: equipmentRows.flatMap((row) =>
          row.value ? [row.value] : [],
        ),
        primaryMuscle: muscleRows.flatMap((row) =>
          row.value ? [row.value] : [],
        ),
      },
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
      equipment: '',
      primaryMuscle: '',
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
    const items = await this.toTemplateDtos(pageRows, actor.id);
    return {
      items,
      nextCursor:
        rows.length > input.limit
          ? encodeTemplateCursor({
              actorId: actor.id,
              kind,
              query: '',
              equipment: '',
              primaryMuscle: '',
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
      .where(
        and(
          inArray(referenceExercises.id, referenceIds),
          eq(referenceExercises.catalogStatus, 'active'),
        ),
      );
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
    return (await this.toTemplateDtos([template], actor.id))[0];
  }

  previewVideo(url: string): ExerciseVideoPreviewDto {
    return parseExerciseVideoUrl(url);
  }

  async putVideo(
    actor: TemplateActor,
    referenceExerciseId: string,
    input: ExerciseVideoInput,
  ) {
    this.requireCoach(actor);
    await this.requireActiveReference(referenceExerciseId);
    const preview = parseExerciseVideoUrl(input.url);
    const now = new Date();
    await this.database.client
      .insert(coachExerciseVideos)
      .values({
        coachAccountId: actor.id,
        referenceExerciseId,
        provider: preview.provider,
        providerVideoId: preview.videoId,
        canonicalSourceUrl: preview.canonicalSourceUrl,
        creatorName: input.creatorName,
        sharingConfirmedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          coachExerciseVideos.coachAccountId,
          coachExerciseVideos.referenceExerciseId,
        ],
        set: {
          provider: preview.provider,
          providerVideoId: preview.videoId,
          canonicalSourceUrl: preview.canonicalSourceUrl,
          creatorName: input.creatorName,
          sharingConfirmedAt: now,
          updatedAt: now,
        },
      });
    return { ...preview, creatorName: input.creatorName };
  }

  async deleteVideo(actor: TemplateActor, referenceExerciseId: string) {
    this.requireCoach(actor);
    await this.requireActiveReference(referenceExerciseId);
    await this.database.client
      .delete(coachExerciseVideos)
      .where(
        and(
          eq(coachExerciseVideos.coachAccountId, actor.id),
          eq(coachExerciseVideos.referenceExerciseId, referenceExerciseId),
        ),
      );
  }

  async get(
    actor: TemplateActor,
    templateId: string,
  ): Promise<WorkoutTemplateDto> {
    this.requireCoach(actor);
    const [template] = await this.database.client
      .select()
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.id, templateId),
          or(
            isNull(workoutTemplates.coachAccountId),
            eq(workoutTemplates.coachAccountId, actor.id),
          ),
        ),
      )
      .limit(1);
    if (!template) {
      return templateError(
        'TEMPLATE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'This workout template is unavailable.',
      );
    }
    return (await this.toTemplateDtos([template], actor.id))[0];
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

  private async requireActiveReference(referenceExerciseId: string) {
    const [reference] = await this.database.client
      .select({ id: referenceExercises.id })
      .from(referenceExercises)
      .where(
        and(
          eq(referenceExercises.id, referenceExerciseId),
          eq(referenceExercises.catalogStatus, 'active'),
        ),
      )
      .limit(1);
    if (!reference) {
      return templateError(
        'EXERCISE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'This exercise is unavailable.',
      );
    }
  }

  private toVideoDto(video: typeof coachExerciseVideos.$inferSelect | null) {
    if (!video) return null;
    const preview = parseExerciseVideoUrl(video.canonicalSourceUrl);
    return { ...preview, creatorName: video.creatorName };
  }

  private async toTemplateDtos(
    templates: Array<typeof workoutTemplates.$inferSelect>,
    actorId: string,
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
    const referenceIds = [
      ...new Set(rows.map((row) => row.exercise.referenceExerciseId)),
    ];
    const videos = referenceIds.length
      ? await this.database.client
          .select()
          .from(coachExerciseVideos)
          .where(
            and(
              eq(coachExerciseVideos.coachAccountId, actorId),
              inArray(coachExerciseVideos.referenceExerciseId, referenceIds),
            ),
          )
      : [];
    const videosByReference = new Map(
      videos.map((video) => [video.referenceExerciseId, video]),
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
          currentVideo: this.toVideoDto(
            videosByReference.get(row.exercise.referenceExerciseId) ?? null,
          ),
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
