import type {
  WeeklyAssignmentRow,
  WeeklyAthleteDetailDto,
  WeeklyDayDto,
  WeeklySummaryDto,
} from './weekly-progress.types';

export function addCalendarDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return value.toISOString().slice(0, 10);
}

export function summarizeWeek(
  assignments: WeeklyAssignmentRow[],
  today: string,
): WeeklySummaryDto {
  const due = assignments.filter((item) => item.assignedDate <= today);
  const completed = due.filter((item) => item.completedAt !== null);
  return {
    assignedCount: assignments.length,
    dueCount: due.length,
    completedCount: completed.length,
    awaitingReviewCount: assignments.filter(
      (item) => item.completedAt !== null && item.reviewedAt === null,
    ).length,
    reviewedCount: assignments.filter((item) => item.reviewedAt !== null)
      .length,
    missedCount: assignments.filter(
      (item) => item.assignedDate < today && item.completedAt === null,
    ).length,
    progressPercent:
      due.length === 0
        ? null
        : Math.round((completed.length / due.length) * 100),
  };
}

function dayFor(
  date: string,
  assignment: WeeklyAssignmentRow | undefined,
  today: string,
): WeeklyDayDto {
  if (!assignment) return { date, state: 'rest', workout: null };
  const state = assignment.reviewedAt
    ? 'reviewed'
    : assignment.completedAt
      ? 'awaiting_review'
      : date < today
        ? 'missed'
        : date === today
          ? 'today'
          : 'scheduled';
  return {
    date,
    state,
    workout: {
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
    },
  };
}

export function buildAthleteWeek(
  athlete: { id: string; displayName: string },
  input: { weekStart: string; timeZone: string },
  assignments: WeeklyAssignmentRow[],
  today: string,
): WeeklyAthleteDetailDto {
  const byDate = new Map(assignments.map((item) => [item.assignedDate, item]));
  return {
    kind: 'athlete',
    week: {
      startDate: input.weekStart,
      endDate: addCalendarDays(input.weekStart, 6),
      timeZone: input.timeZone,
    },
    athlete,
    summary: summarizeWeek(assignments, today),
    days: Array.from({ length: 7 }, (_, index) => {
      const date = addCalendarDays(input.weekStart, index);
      return dayFor(date, byDate.get(date), today);
    }),
  };
}
