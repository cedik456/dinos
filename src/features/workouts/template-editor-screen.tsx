import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { Pressable, Text, View } from "@/components/ui/tw";
import {
  TemplateApiError,
  type ReferenceExercise,
  type TemplateExerciseInput,
} from "@/features/workouts/template-api";
import {
  useWorkoutActor,
  type WorkoutActor,
} from "@/features/workouts/workout-auth";
import {
  WorkoutButton,
  WorkoutCard,
  WorkoutField,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import {
  useCreateTemplate,
  useReferenceExercises,
} from "@/features/workouts/template-queries";

type ExerciseDraft = TemplateExerciseInput & {
  name: string;
  setsText: string;
};

type FormErrors = Record<string, string>;

function TemplateEditorContent({ actor }: { actor: WorkoutActor }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [overviewNote, setOverviewNote] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ExerciseDraft[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const references = useReferenceExercises(actor, true, search);
  const create = useCreateTemplate(actor);
  const available = useMemo(
    () => references.data?.pages.flatMap((page) => page.items) ?? [],
    [references.data],
  );

  const isSelected = (id: string) =>
    selected.some((exercise) => exercise.referenceExerciseId === id);

  const toggle = (exercise: ReferenceExercise) => {
    setSelected((current) => {
      const exists = current.some(
        (item) => item.referenceExerciseId === exercise.id,
      );
      if (exists) {
        return current.filter(
          (item) => item.referenceExerciseId !== exercise.id,
        );
      }
      if (current.length >= 12) return current;
      return [
        ...current,
        {
          referenceExerciseId: exercise.id,
          name: exercise.name,
          sets: exercise.defaultSets,
          setsText: String(exercise.defaultSets),
          repetitions: exercise.defaultRepetitions,
          instruction: exercise.instruction,
        },
      ];
    });
  };

  const updateExercise = (
    id: string,
    field: "setsText" | "repetitions" | "instruction",
    value: string,
  ) => {
    setSelected((current) =>
      current.map((exercise) =>
        exercise.referenceExerciseId === id
          ? { ...exercise, [field]: value }
          : exercise,
      ),
    );
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Add a template name.";
    if (selected.length === 0) {
      next.exercises = "Select at least one exercise.";
    }
    selected.forEach((exercise) => {
      const sets = Number(exercise.setsText);
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
        next[`sets-${exercise.referenceExerciseId}`] =
          "Sets must be from 1 through 20.";
      }
      if (!exercise.repetitions.trim()) {
        next[`repetitions-${exercise.referenceExerciseId}`] =
          "Add a repetitions or duration prescription.";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    create.mutate(
      {
        name,
        overviewNote,
        exercises: selected.map((exercise) => ({
          referenceExerciseId: exercise.referenceExerciseId,
          sets: Number(exercise.setsText),
          repetitions: exercise.repetitions,
          instruction: exercise.instruction,
        })),
      },
      { onSuccess: () => router.replace("/coach/programs") },
    );
  };

  const apiError =
    create.error instanceof TemplateApiError ? create.error : null;

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach templates"
        title="Create a template"
        description="Name it once, select several exercises, then keep the prescription ready for future assignments."
      />

      {apiError ? (
        <WorkoutMessage
          tone="error"
          title="Template not saved"
          message={`${apiError.message} Your selections are still here.`}
        />
      ) : null}

      <WorkoutCard>
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Template details
          </Text>
          <Text className="font-sans text-body text-muted">
            This template belongs only to your Coach account.
          </Text>
        </View>
        <WorkoutField
          label="Template name"
          value={name}
          onChangeText={setName}
          maxLength={100}
          error={errors.name}
          placeholder="Full Body B"
        />
        <WorkoutField
          label="Coaching notes, optional"
          value={overviewNote}
          onChangeText={setOverviewNote}
          maxLength={1000}
          multiline
          placeholder="Goal, cues, or progression notes"
        />
      </WorkoutCard>

      <View className="gap-md">
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Add exercises
          </Text>
          <Text className="font-sans text-body text-muted">
            Search and select several exercises. They are added in the order you
            choose them.
          </Text>
        </View>
        <WorkoutField
          label="Search exercises"
          value={search}
          onChangeText={setSearch}
          maxLength={100}
          placeholder="Cable, dumbbell, walking"
        />
        <Text className="font-sans text-label font-semibold text-accent-foreground">
          {selected.length} selected
        </Text>
        {errors.exercises ? (
          <Text
            accessibilityRole="alert"
            className="font-sans text-caption text-danger"
          >
            {errors.exercises}
          </Text>
        ) : null}
        {references.isPending ? (
          <WorkoutLoading label="Loading reference exercises" />
        ) : null}
        {references.isError ? (
          <WorkoutMessage
            tone="error"
            title="Exercises unavailable"
            message="Dino could not load the exercise list."
            actionLabel="Try again"
            onAction={() => void references.refetch()}
          />
        ) : null}
        {!references.isPending &&
        !references.isError &&
        available.length === 0 ? (
          <WorkoutMessage
            title="No matching exercises"
            message="Try another name. Custom exercises are not part of this first template pass."
          />
        ) : null}
        {available.map((exercise) => {
          const checked = isSelected(exercise.id);
          return (
            <Pressable
              key={exercise.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${checked ? "Remove" : "Add"} ${exercise.name}`}
              onPress={() => toggle(exercise)}
              className={
                checked
                  ? "min-h-12 flex-row items-center gap-md rounded-card border border-accent bg-accent-soft p-md"
                  : "min-h-12 flex-row items-center gap-md rounded-card border border-border bg-surface p-md"
              }
            >
              <View
                accessibilityElementsHidden
                className={
                  checked
                    ? "size-6 items-center justify-center rounded-pill bg-accent"
                    : "size-6 rounded-pill border border-border bg-surface"
                }
              >
                {checked ? (
                  <View className="size-2 rounded-pill bg-surface" />
                ) : null}
              </View>
              <View className="flex-1 gap-xs">
                <Text className="font-sans text-label font-semibold text-foreground">
                  {exercise.name}
                </Text>
                <Text className="font-sans text-caption text-muted">
                  {exercise.defaultSets}{" "}
                  {exercise.defaultSets === 1 ? "set" : "sets"} ·{" "}
                  {exercise.defaultRepetitions}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {references.hasNextPage ? (
          <WorkoutButton
            label={
              references.isFetchingNextPage
                ? "Loading more"
                : "Load more exercises"
            }
            variant="secondary"
            disabled={references.isFetchingNextPage}
            onPress={() => void references.fetchNextPage()}
          />
        ) : null}
      </View>

      {selected.length > 0 ? (
        <View className="gap-md">
          <View className="gap-xs">
            <Text className="font-sans text-heading font-bold text-foreground">
              Prescription
            </Text>
            <Text className="font-sans text-body text-muted">
              Defaults are ready. Adjust only what this template needs.
            </Text>
          </View>
          {selected.map((exercise, index) => (
            <WorkoutCard key={exercise.referenceExerciseId}>
              <View className="flex-row items-center justify-between gap-md">
                <View className="flex-1 gap-xs">
                  <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
                    Exercise {index + 1}
                  </Text>
                  <Text className="font-sans text-heading font-bold text-foreground">
                    {exercise.name}
                  </Text>
                </View>
                <WorkoutButton
                  label="Remove"
                  variant="ghost"
                  accessibilityLabel={`Remove ${exercise.name}`}
                  onPress={() =>
                    setSelected((current) =>
                      current.filter(
                        (item) =>
                          item.referenceExerciseId !==
                          exercise.referenceExerciseId,
                      ),
                    )
                  }
                />
              </View>
              <View className="flex-row gap-md">
                <View className="flex-1">
                  <WorkoutField
                    label="Sets"
                    value={exercise.setsText}
                    onChangeText={(value) =>
                      updateExercise(
                        exercise.referenceExerciseId,
                        "setsText",
                        value,
                      )
                    }
                    keyboardType="number-pad"
                    maxLength={2}
                    error={errors[`sets-${exercise.referenceExerciseId}`]}
                  />
                </View>
                <View className="flex-[2]">
                  <WorkoutField
                    label="Repetitions or duration"
                    value={exercise.repetitions}
                    onChangeText={(value) =>
                      updateExercise(
                        exercise.referenceExerciseId,
                        "repetitions",
                        value,
                      )
                    }
                    maxLength={32}
                    error={
                      errors[`repetitions-${exercise.referenceExerciseId}`]
                    }
                  />
                </View>
              </View>
              <WorkoutField
                label="Instruction, optional"
                value={exercise.instruction ?? ""}
                onChangeText={(value) =>
                  updateExercise(
                    exercise.referenceExerciseId,
                    "instruction",
                    value,
                  )
                }
                maxLength={1000}
                multiline
              />
            </WorkoutCard>
          ))}
        </View>
      ) : null}

      <WorkoutButton
        label={create.isPending ? "Saving template" : "Save template"}
        disabled={create.isPending}
        onPress={save}
      />
    </WorkoutScreen>
  );
}

export function TemplateEditorScreen() {
  const { actor, ready } = useWorkoutActor("Coach");
  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing template editor" />
      </WorkoutScreen>
    );
  }
  return <TemplateEditorContent actor={actor} />;
}
