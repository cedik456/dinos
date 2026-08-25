import { Text, View } from "@/components/ui/tw";
import type { WorkoutSummary } from "@/features/workouts/workout-api";
import {
  formatWorkoutDate,
  WorkoutButton,
  WorkoutCard,
  WorkoutStatusBadge,
} from "@/features/workouts/components/workout-ui";

export function WorkoutSummaryCard({
  workout,
  onOpen,
  onEdit,
}: {
  workout: WorkoutSummary;
  onOpen: () => void;
  onEdit?: () => void;
}) {
  return (
    <WorkoutCard>
      <View className="flex-row items-start justify-between gap-md">
        <View className="min-w-0 flex-1 gap-xs">
          <Text className="font-sans text-caption font-semibold uppercase tracking-wide text-muted">
            {formatWorkoutDate(workout.assignedDate)}
          </Text>
          <Text className="font-sans text-heading font-bold text-foreground">
            {workout.title}
          </Text>
          <Text className="font-sans text-body text-muted">
            {workout.exerciseCount}{" "}
            {workout.exerciseCount === 1 ? "exercise" : "exercises"} ·{" "}
            {workout.athlete.displayName}
          </Text>
        </View>
        <WorkoutStatusBadge status={workout.status} />
      </View>
      <View className="flex-row flex-wrap gap-sm">
        <View className="min-w-36 flex-1">
          <WorkoutButton
            label="Open workout"
            variant="secondary"
            onPress={onOpen}
          />
        </View>
        {onEdit && workout.actions.canEdit ? (
          <View className="min-w-28 flex-1">
            <WorkoutButton label="Edit" variant="ghost" onPress={onEdit} />
          </View>
        ) : null}
      </View>
    </WorkoutCard>
  );
}
