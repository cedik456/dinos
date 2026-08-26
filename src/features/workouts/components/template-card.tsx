import { Text, View } from "@/components/ui/tw";
import type { WorkoutTemplate } from "@/features/workouts/template-api";
import {
  WorkoutButton,
  WorkoutCard,
} from "@/features/workouts/components/workout-ui";

export function TemplateCard({
  template,
  onUse,
}: {
  template: WorkoutTemplate;
  onUse: () => void;
}) {
  return (
    <WorkoutCard>
      <View className="flex-row items-start justify-between gap-md">
        <View className="flex-1 gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            {template.name}
          </Text>
          <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
            {template.scope === "Dino" ? "Dino starter" : "Your template"}
            {` · ${template.exerciseCount} exercises`}
          </Text>
        </View>
      </View>
      {template.overviewNote ? (
        <Text className="font-sans text-body text-muted">
          {template.overviewNote}
        </Text>
      ) : null}
      <View className="gap-sm rounded-medium bg-surface-muted p-md">
        {template.exercises.map((exercise) => (
          <View key={exercise.id} className="flex-row items-start gap-md">
            <Text className="w-6 font-sans text-label font-bold text-accent-foreground">
              {exercise.position}
            </Text>
            <View className="flex-1 gap-xs">
              <Text className="font-sans text-label font-semibold text-foreground">
                {exercise.name}
              </Text>
              <Text className="font-sans text-caption text-muted">
                {exercise.sets} {exercise.sets === 1 ? "set" : "sets"} ·{" "}
                {exercise.repetitions}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <WorkoutButton
        label="Use template"
        accessibilityLabel={`Use ${template.name} template`}
        onPress={onUse}
      />
    </WorkoutCard>
  );
}
