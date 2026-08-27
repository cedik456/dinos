import type { AccountRole, WorkoutAssignmentStatus } from '../database/schema';

export type WeeklyProgressActor = {
  id: string;
  displayName: string;
  role: AccountRole;
};

export type WeeklyProgressInput = {
  weekStart: string;
  timeZone: string;
  cursor: string | null;
  limit: number;
};

export type WeeklySummaryDto = {
  assignedCount: number;
  dueCount: number;
  completedCount: number;
  awaitingReviewCount: number;
  reviewedCount: number;
  missedCount: number;
  progressPercent: number | null;
};

export type WeeklyDayState =
  'rest' | 'scheduled' | 'today' | 'missed' | 'awaiting_review' | 'reviewed';

export type WeeklyWorkoutDto = {
  id: string;
  title: string;
  status: WorkoutAssignmentStatus;
};

export type WeeklyDayDto = {
  date: string;
  state: WeeklyDayState;
  workout: WeeklyWorkoutDto | null;
};

export type WeeklyAthleteDetailDto = {
  kind: 'athlete';
  week: { startDate: string; endDate: string; timeZone: string };
  athlete: { id: string; displayName: string };
  summary: WeeklySummaryDto;
  days: WeeklyDayDto[];
};

export type WeeklyCoachRowDto = {
  athlete: { id: string; displayName: string };
  summary: WeeklySummaryDto;
};

export type WeeklyCoachOverviewDto = {
  kind: 'coach';
  week: { startDate: string; endDate: string; timeZone: string };
  summary: WeeklySummaryDto & { activeAthleteCount: number };
  items: WeeklyCoachRowDto[];
  nextCursor: string | null;
};

export type WeeklyAssignmentRow = {
  id: string;
  athleteAccountId: string;
  title: string;
  assignedDate: string;
  status: WorkoutAssignmentStatus;
  completedAt: Date | null;
  reviewedAt: Date | null;
};
