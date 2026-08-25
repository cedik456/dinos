import type { AccountRole, WorkoutAssignmentStatus } from '../database/schema';

export type WorkoutExerciseInput = {
  name: string;
  sets: number;
  repetitions: string;
  instruction: string | null;
};

export type WorkoutUpsertInput = {
  athleteAccountId?: string;
  title: string;
  overviewNote: string | null;
  assignedDate: string;
  creationTimeZone?: string;
  exercises: WorkoutExerciseInput[];
};

export type WorkoutActor = {
  id: string;
  displayName: string;
  role: AccountRole;
};

export type WorkoutListFilters = {
  cursor: string | null;
  limit: number;
  status: WorkoutAssignmentStatus | null;
  dateFrom: string | null;
  dateTo: string | null;
  relative: 'today' | 'upcoming' | 'past' | null;
  awaitingReview: boolean;
  direction: 'asc' | 'desc';
};

export type WorkoutAssignmentSummaryDto = {
  id: string;
  title: string;
  assignedDate: string;
  dateRelation: 'past' | 'today' | 'future';
  status: WorkoutAssignmentStatus;
  coach: { id: string; displayName: string };
  athlete: { id: string; displayName: string };
  exerciseCount: number;
  completedAt: string | null;
  reviewedAt: string | null;
  awaitingReview: boolean;
  createdAt: string;
  updatedAt: string;
  actions: { canEdit: boolean; canComplete: boolean; canReview: boolean };
};

export type WorkoutAssignmentDetailDto = WorkoutAssignmentSummaryDto & {
  overviewNote: string | null;
  creationTimeZone: string;
  exercises: Array<{
    id: string;
    position: number;
    name: string;
    sets: number;
    repetitions: string;
    instruction: string | null;
  }>;
  completion: { note: string | null; completedAt: string } | null;
  review: { response: string | null; reviewedAt: string } | null;
};

export type WorkoutAssignmentPageDto = {
  items: WorkoutAssignmentSummaryDto[];
  nextCursor: string | null;
};
