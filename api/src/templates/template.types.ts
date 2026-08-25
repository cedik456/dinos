import type { WorkoutActor } from '../workouts/workout.types';

export type TemplateActor = WorkoutActor;

export type TemplateExerciseInput = {
  referenceExerciseId: string;
  sets: number;
  repetitions: string;
  instruction: string | null;
};

export type TemplateCreateInput = {
  name: string;
  overviewNote: string | null;
  exercises: TemplateExerciseInput[];
};

export type TemplateListInput = {
  cursor: string | null;
  limit: number;
  query: string;
};

export type ReferenceExerciseDto = {
  id: string;
  name: string;
  defaultSets: number;
  defaultRepetitions: string;
  instruction: string | null;
};

export type WorkoutTemplateDto = {
  id: string;
  scope: 'Dino' | 'Coach';
  name: string;
  overviewNote: string | null;
  exerciseCount: number;
  exercises: Array<{
    id: string;
    referenceExerciseId: string;
    position: number;
    name: string;
    sets: number;
    repetitions: string;
    instruction: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PageDto<T> = {
  items: T[];
  nextCursor: string | null;
};
