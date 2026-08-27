import type { WorkoutActor } from '../workouts/workout.types';

export type TemplateActor = WorkoutActor;

export type TemplateExerciseInput = {
  referenceExerciseId: string;
  sets: number;
  repetitions: string;
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
  equipment: string;
  primaryMuscle: string;
};

export type ExerciseVideoProvider = 'youtube' | 'vimeo';

export type ExerciseVideoPreviewDto = {
  provider: ExerciseVideoProvider;
  videoId: string;
  canonicalSourceUrl: string;
  embedUrl: string;
};

export type ExerciseVideoInput = {
  url: string;
  creatorName: string;
  rightsConfirmed: true;
};

export type ReferenceExerciseDto = {
  id: string;
  name: string;
  exerciseType: string;
  equipment: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  isStretch: boolean;
  illustrationFrames: Array<{
    index: 1 | 2 | 3;
    url: string;
    width: number;
    height: number;
  }>;
  illustrationAttribution: {
    creator: string;
    creatorUrl: string;
    license: string;
    licenseUrl: string;
  };
  currentVideo: ({ creatorName: string } & ExerciseVideoPreviewDto) | null;
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
    currentVideo: ({ creatorName: string } & ExerciseVideoPreviewDto) | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PageDto<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ReferenceExercisePageDto = PageDto<ReferenceExerciseDto> & {
  filters: { equipment: string[]; primaryMuscle: string[] };
};
