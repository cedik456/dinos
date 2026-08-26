import {
  addCalendarDays,
  buildAthleteWeek,
  summarizeWeek,
} from './weekly-progress-calculation';
import type { WeeklyAssignmentRow } from './weekly-progress.types';

function assignment(
  id: string,
  assignedDate: string,
  state: 'assigned' | 'completed' | 'reviewed',
): WeeklyAssignmentRow {
  return {
    id,
    athleteAccountId: '10000000-0000-4000-8000-000000000002',
    title: `Workout ${id}`,
    assignedDate,
    status: state,
    completedAt: state === 'assigned' ? null : new Date('2026-08-25T00:00:00Z'),
    reviewedAt: state === 'reviewed' ? new Date('2026-08-25T01:00:00Z') : null,
  };
}

describe('weekly progress calculation', () => {
  it('uses Monday through Sunday calendar dates', () => {
    expect(addCalendarDays('2026-08-24', 6)).toBe('2026-08-30');
  });

  it('counts completion once and excludes future work from progress', () => {
    const summary = summarizeWeek(
      [
        assignment('1', '2026-08-24', 'reviewed'),
        assignment('2', '2026-08-25', 'completed'),
        assignment('3', '2026-08-26', 'assigned'),
        assignment('4', '2026-08-28', 'assigned'),
      ],
      '2026-08-26',
    );
    expect(summary).toEqual({
      assignedCount: 4,
      dueCount: 3,
      completedCount: 2,
      awaitingReviewCount: 1,
      reviewedCount: 1,
      missedCount: 0,
      progressPercent: 67,
    });
  });

  it('returns no progress when nothing is due and derives every day state', () => {
    const detail = buildAthleteWeek(
      { id: 'athlete', displayName: 'Mika' },
      { weekStart: '2026-08-24', timeZone: 'Asia/Manila' },
      [
        assignment('1', '2026-08-24', 'assigned'),
        assignment('2', '2026-08-25', 'completed'),
        assignment('3', '2026-08-26', 'reviewed'),
        assignment('4', '2026-08-28', 'assigned'),
      ],
      '2026-08-27',
    );
    expect(detail.days.map((day) => day.state)).toEqual([
      'missed',
      'awaiting_review',
      'reviewed',
      'rest',
      'scheduled',
      'rest',
      'rest',
    ]);
    expect(summarizeWeek([], '2026-08-20').progressPercent).toBeNull();
  });
});
