import { Pressable, Text, View } from "@/components/ui/tw";
import type {
  WeeklyAthleteDetail,
  WeeklyDayState,
  WeeklySummary,
} from "@/features/weekly-progress/weekly-progress-api";
import {
  formatDay,
  formatShortDate,
} from "@/features/weekly-progress/weekly-progress-date";
import {
  WorkoutCard,
  WorkoutStatusBadge,
} from "@/features/workouts/components/workout-ui";
import { cn } from "@/utils/cn";

const stateLabel: Record<WeeklyDayState, string> = {
  rest: "Rest",
  scheduled: "Scheduled",
  today: "Today",
  missed: "Missed",
  awaiting_review: "Awaiting review",
  reviewed: "Reviewed",
};

export function WeekNavigator({
  offset,
  startDate,
  endDate,
  onChange,
}: {
  offset: number;
  startDate: string;
  endDate: string;
  onChange: (offset: number) => void;
}) {
  return (
    <View className="gap-md">
      <View className="flex-row items-center justify-between gap-md">
        <Pressable
          accessibilityLabel="Previous week"
          accessibilityRole="button"
          disabled={offset <= -1}
          onPress={() => onChange(offset - 1)}
          className={cn(
            "min-h-12 min-w-12 items-center justify-center rounded-pill border border-border bg-surface px-md active:opacity-80",
            offset <= -1 && "opacity-40",
          )}
        >
          <Text className="font-sans text-heading font-bold text-foreground">
            ‹
          </Text>
        </Pressable>
        <View className="flex-1 items-center gap-xs">
          <Text className="font-sans text-label font-semibold text-foreground">
            {offset === 0
              ? "This week"
              : offset < 0
                ? "Previous week"
                : "Next week"}
          </Text>
          <Text className="font-sans text-caption text-muted">
            {formatShortDate(startDate)} to {formatShortDate(endDate)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Next week"
          accessibilityRole="button"
          disabled={offset >= 1}
          onPress={() => onChange(offset + 1)}
          className={cn(
            "min-h-12 min-w-12 items-center justify-center rounded-pill border border-border bg-surface px-md active:opacity-80",
            offset >= 1 && "opacity-40",
          )}
        >
          <Text className="font-sans text-heading font-bold text-foreground">
            ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WeeklySummaryCard({
  summary,
  title = "Weekly progress",
}: {
  summary: WeeklySummary;
  title?: string;
}) {
  const progressLabel =
    summary.progressPercent === null
      ? "No workouts due"
      : `${summary.progressPercent}%`;
  return (
    <WorkoutCard className="gap-lg bg-accent-soft">
      <View className="flex-row items-start justify-between gap-lg">
        <View className="flex-1 gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            {title}
          </Text>
          <Text className="font-sans text-body text-muted">
            {summary.completedCount} of {summary.dueCount} due workouts complete
          </Text>
        </View>
        <Text className="font-sans text-heading font-bold text-accent-foreground">
          {progressLabel}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-sm">
        <SummaryPill label="Awaiting" value={summary.awaitingReviewCount} />
        <SummaryPill label="Reviewed" value={summary.reviewedCount} />
        <SummaryPill label="Missed" value={summary.missedCount} danger />
      </View>
    </WorkoutCard>
  );
}

function SummaryPill({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <View
      className={cn(
        "min-h-8 flex-row items-center gap-xs rounded-pill bg-surface px-md",
        danger && value > 0 && "bg-danger-soft",
      )}
    >
      <Text
        className={cn(
          "font-sans text-caption font-semibold text-muted",
          danger && value > 0 && "text-danger",
        )}
      >
        {value} {label}
      </Text>
    </View>
  );
}

export function WeeklyAthleteRecord({
  detail,
  onOpenWorkout,
}: {
  detail: WeeklyAthleteDetail;
  onOpenWorkout: (id: string) => void;
}) {
  return (
    <View className="gap-xl">
      <WeeklySummaryCard summary={detail.summary} />
      {detail.summary.assignedCount === 0 ? (
        <WorkoutCard>
          <Text className="font-sans text-heading font-bold text-foreground">
            No workouts assigned
          </Text>
          <Text className="font-sans text-body text-muted">
            This week is clear. New dated workouts will appear here.
          </Text>
        </WorkoutCard>
      ) : null}
      <View className="gap-md">
        <Text className="font-sans text-heading font-bold text-foreground">
          Monday to Sunday
        </Text>
        {detail.days.map((day) => {
          const content = (
            <View className="min-h-16 flex-row items-center gap-md rounded-card border border-border bg-surface p-md">
              <View className="w-14 gap-xs">
                <Text className="font-sans text-caption font-semibold text-muted">
                  {formatDay(day.date)}
                </Text>
                <Text className="font-sans text-label font-semibold text-foreground">
                  {formatShortDate(day.date)}
                </Text>
              </View>
              <View className="flex-1 gap-xs">
                <Text className="font-sans text-body font-semibold text-foreground">
                  {day.workout?.title ?? "Rest day"}
                </Text>
                <Text
                  className={cn(
                    "font-sans text-caption font-semibold text-muted",
                    day.state === "missed" && "text-danger",
                    day.state === "awaiting_review" && "text-warning",
                    day.state === "reviewed" && "text-success",
                    day.state === "today" && "text-accent-foreground",
                  )}
                >
                  {stateLabel[day.state]}
                </Text>
              </View>
              {day.workout ? (
                <WorkoutStatusBadge status={day.workout.status} />
              ) : null}
            </View>
          );
          return day.workout ? (
            <Pressable
              key={day.date}
              accessibilityLabel={`${day.workout.title}, ${stateLabel[day.state]}, open workout`}
              accessibilityRole="button"
              onPress={() => onOpenWorkout(day.workout!.id)}
              className="active:opacity-80"
            >
              {content}
            </Pressable>
          ) : (
            <View key={day.date}>{content}</View>
          );
        })}
      </View>
    </View>
  );
}
