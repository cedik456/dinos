import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  exercises,
  getAssetUrl,
  normalizeSearchText,
} from '@bryllim/workout-guide';
import { eq } from 'drizzle-orm';
import { referenceExercises } from '../database/schema';
import { DatabaseService } from '../database/database.service';

const CATALOG_SOURCE = '@bryllim/workout-guide';
const CATALOG_VERSION = '1.0.0';

const LEGACY_NAMES_BY_SLUG: Record<string, string> = {
  'smith-machine-bench-press': 'Smith Flat Bench Press',
  'lat-pulldown': 'Cable Lat Pulldown',
  'seated-row': 'Cable Row',
  'tricep-pushdown': 'Cable Triceps Pushdown',
  'bicep-curl': 'Dumbbell Curl',
  walking: 'Easy walking',
};

function deterministicUuid(value: string): string {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type CatalogImportReport = {
  source: string;
  version: string;
  imported: number;
  preservedIds: number;
  unavailable: number;
};

@Injectable()
export class CatalogImportService {
  constructor(private readonly database: DatabaseService) {}

  async reconcile(): Promise<CatalogImportReport> {
    return this.database.client.transaction(async (tx) => {
      const existing = await tx.select().from(referenceExercises);
      const bySourceSlug = new Map(
        existing
          .filter((row) => row.catalogSource && row.catalogSlug)
          .map((row) => [`${row.catalogSource}:${row.catalogSlug}`, row]),
      );
      const byName = new Map(
        existing.map((row) => [normalizeSearchText(row.name), row]),
      );

      await tx
        .update(referenceExercises)
        .set({ catalogStatus: 'unavailable' })
        .where(eq(referenceExercises.catalogSource, CATALOG_SOURCE));

      let preservedIds = 0;
      const values = exercises.map((exercise) => {
        const existingRow =
          bySourceSlug.get(`${CATALOG_SOURCE}:${exercise.slug}`) ??
          byName.get(normalizeSearchText(exercise.name)) ??
          byName.get(
            normalizeSearchText(
              LEGACY_NAMES_BY_SLUG[exercise.slug] ?? exercise.name,
            ),
          );
        if (existingRow) preservedIds += 1;
        return {
          id:
            existingRow?.id ??
            deterministicUuid(`${CATALOG_SOURCE}:${exercise.slug}`),
          name: exercise.name,
          defaultSets: existingRow?.defaultSets ?? null,
          defaultRepetitions: existingRow?.defaultRepetitions ?? null,
          catalogSource: CATALOG_SOURCE,
          catalogVersion: CATALOG_VERSION,
          catalogSlug: exercise.slug,
          catalogStatus: 'active' as const,
          exerciseType: exercise.exerciseType,
          equipment: exercise.equipment,
          primaryMuscle: exercise.primaryMuscle,
          secondaryMuscles: exercise.secondaryMuscles,
          isStretch: exercise.isStretch,
          illustrationFrames: exercise.frames.map((frame) => ({
            index: frame.index,
            url: getAssetUrl(exercise.slug, frame.index, {
              version: CATALOG_VERSION,
            })!,
            width: frame.width,
            height: frame.height,
          })),
          illustrationAttribution: exercise.attribution,
        };
      });

      await tx.insert(referenceExercises).values(values).onConflictDoNothing();

      // Drizzle does not expose the complete excluded row as a typed value, so
      // update imported rows explicitly after the conflict-safe insert.
      for (const value of values) {
        await tx
          .update(referenceExercises)
          .set(value)
          .where(eq(referenceExercises.id, value.id));
      }

      const unavailableRows = await tx
        .select({ id: referenceExercises.id })
        .from(referenceExercises)
        .where(eq(referenceExercises.catalogStatus, 'unavailable'));

      return {
        source: CATALOG_SOURCE,
        version: CATALOG_VERSION,
        imported: values.length,
        preservedIds,
        unavailable: unavailableRows.length,
      };
    });
  }
}
