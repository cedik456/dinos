import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { Text, View } from "@/components/ui/tw";
import {
  type WorkoutDetail,
  type WorkoutExerciseInput,
  WorkoutApiError,
} from "@/features/workouts/workout-api";
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
  useCreateWorkout,
  useEditWorkout,
  useWorkoutDetail,
} from "@/features/workouts/workout-queries";
import { useRosterAthletes } from "@/features/roster/roster-queries";

type ExerciseDraft = {
  name: string;
  sets: string;
  repetitions: string;
  instruction: string;
};

type FormErrors = Record<string, string>;

function deviceDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function WorkoutEditorContent({
  actor,
  assignment,
  refresh,
}: {
  actor: WorkoutActor;
  assignment: WorkoutDetail | null;
  refresh: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [overviewNote, setOverviewNote] = useState(
    assignment?.overviewNote ?? "",
  );
  const [assignedDate, setAssignedDate] = useState(
    assignment?.assignedDate ?? deviceDate(),
  );
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    assignment?.exercises.map((exercise) => ({
      name: exercise.name,
      sets: String(exercise.sets),
      repetitions: exercise.repetitions,
      instruction: exercise.instruction ?? "",
    })) ?? [{ name: "", sets: "3", repetitions: "", instruction: "" }],
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const roster = useRosterAthletes(actor, true);
  const rosterAthletes = useMemo(
    () => roster.data?.pages.flatMap((page) => page.items) ?? [],
    [roster.data],
  );
  const [athleteAccountId, setAthleteAccountId] = useState("");
  const createMutation = useCreateWorkout(actor);
  const editMutation = useEditWorkout(actor, assignment?.id ?? "");
  const mutation = assignment ? editMutation : createMutation;

  useEffect(() => {
    if (!assignment && !athleteAccountId && rosterAthletes[0]) {
      setAthleteAccountId(rosterAthletes[0].athleteAccountId);
    }
  }, [assignment, athleteAccountId, rosterAthletes]);

  const updateExercise = (
    index: number,
    field: keyof ExerciseDraft,
    value: string,
  ) => {
    setExercises((current) =>
      current.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, [field]: value } : exercise,
      ),
    );
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!assignment && !actor.previewRole && !athleteAccountId) {
      next.athleteAccountId = "Select an active roster Athlete.";
    }
    if (!title.trim()) next.title = "Add a workout title.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assignedDate)) {
      next.assignedDate = "Use a date in YYYY-MM-DD format.";
    }
    exercises.forEach((exercise, index) => {
      if (!exercise.name.trim())
        next[`name-${index}`] = "Add an exercise name.";
      const sets = Number(exercise.sets);
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
        next[`sets-${index}`] = "Sets must be from 1 through 20.";
      }
      if (!exercise.repetitions.trim()) {
        next[`repetitions-${index}`] = "Add a repetitions prescription.";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const normalizedExercises: WorkoutExerciseInput[] = exercises.map(
      (exercise) => ({
        name: exercise.name,
        sets: Number(exercise.sets),
        repetitions: exercise.repetitions,
        instruction: exercise.instruction,
      }),
    );
    const input = {
      ...(!assignment && !actor.previewRole ? { athleteAccountId } : {}),
      title,
      overviewNote,
      assignedDate,
      ...(!assignment
        ? { creationTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
        : {}),
      exercises: normalizedExercises,
    };
    mutation.mutate(input, { onSuccess: () => router.back() });
  };

  const apiError =
    mutation.error instanceof WorkoutApiError ? mutation.error : null;

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach programs"
        title={assignment ? "Edit workout" : "Assign a workout"}
        description={
          assignment
            ? "Replace the date and exercise plan while this workout is still assigned."
            : "Create one focused session and place it on an active Athlete’s plan."
        }
      />

      {apiError ? (
        <WorkoutMessage
          tone={apiError.status === 409 ? "stale" : "error"}
          title={
            apiError.status === 409
              ? "The workout changed"
              : "The workout was not saved"
          }
          message={apiError.message}
          actionLabel={
            apiError.status === 409
              ? assignment
                ? "Refresh workout"
                : "Refresh programs"
              : undefined
          }
          onAction={
            apiError.status === 409
              ? assignment
                ? refresh
                : () => router.back()
              : undefined
          }
        />
      ) : null}

      {!assignment && !actor.previewRole ? (
        <WorkoutCard>
          <View className="gap-xs">
            <Text className="font-sans text-heading font-bold text-foreground">
              Athlete
            </Text>
            <Text className="font-sans text-body text-muted">
              Only accepted Athletes in your private roster can receive this
              workout.
            </Text>
          </View>
          {roster.isPending ? (
            <WorkoutLoading label="Loading active Athletes" />
          ) : null}
          {roster.isError ? (
            <WorkoutMessage
              tone="error"
              title="Roster unavailable"
              message="Dino could not load your active Athletes."
              actionLabel="Try again"
              onAction={() => void roster.refetch()}
            />
          ) : null}
          {!roster.isPending &&
          !roster.isError &&
          rosterAthletes.length === 0 ? (
            <WorkoutMessage
              title="No active Athletes"
              message="Invite an Athlete and wait for acceptance before assigning a workout."
            />
          ) : null}
          {rosterAthletes.map((athlete) => (
            <WorkoutButton
              key={athlete.relationshipId}
              label={athlete.displayName}
              variant={
                athleteAccountId === athlete.athleteAccountId
                  ? "primary"
                  : "secondary"
              }
              accessibilityLabel={`Assign workout to ${athlete.displayName}`}
              onPress={() => setAthleteAccountId(athlete.athleteAccountId)}
            />
          ))}
          {errors.athleteAccountId ? (
            <Text
              accessibilityRole="alert"
              className="font-sans text-caption text-danger"
            >
              {errors.athleteAccountId}
            </Text>
          ) : null}
        </WorkoutCard>
      ) : null}

      <WorkoutCard>
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Workout details
          </Text>
          <Text className="font-sans text-body text-muted">
            Mika can read future workouts, but completion opens only on the
            assigned date.
          </Text>
        </View>
        <WorkoutField
          label="Workout title"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          error={errors.title}
          placeholder="Lower body strength"
        />
        <WorkoutField
          label="Assigned date"
          value={assignedDate}
          onChangeText={setAssignedDate}
          autoCapitalize="none"
          maxLength={10}
          error={errors.assignedDate}
          placeholder="YYYY-MM-DD"
        />
        <WorkoutField
          label="Overview note, optional"
          value={overviewNote}
          onChangeText={setOverviewNote}
          maxLength={1000}
          multiline
          placeholder="What should Mika focus on today?"
        />
      </WorkoutCard>

      <View className="gap-md">
        <View className="flex-row items-end justify-between gap-md">
          <View className="flex-1 gap-xs">
            <Text className="font-sans text-heading font-bold text-foreground">
              Exercises
            </Text>
            <Text className="font-sans text-body text-muted">
              Keep the order intentional. You can add up to 12 exercises.
            </Text>
          </View>
          <Text className="font-sans text-label font-semibold text-accent-foreground">
            {exercises.length} of 12
          </Text>
        </View>
        {exercises.map((exercise, index) => (
          <WorkoutCard key={index}>
            <View className="flex-row items-center justify-between gap-md">
              <Text className="font-sans text-label font-semibold text-accent-foreground">
                EXERCISE {index + 1}
              </Text>
              {exercises.length > 1 ? (
                <WorkoutButton
                  label="Remove"
                  variant="ghost"
                  accessibilityLabel={`Remove exercise ${index + 1}`}
                  onPress={() =>
                    setExercises((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
              ) : null}
            </View>
            <WorkoutField
              label="Exercise name"
              value={exercise.name}
              onChangeText={(value) => updateExercise(index, "name", value)}
              maxLength={100}
              error={errors[`name-${index}`]}
              placeholder="Goblet squat"
            />
            <View className="flex-row gap-md">
              <View className="flex-1">
                <WorkoutField
                  label="Sets"
                  value={exercise.sets}
                  onChangeText={(value) => updateExercise(index, "sets", value)}
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors[`sets-${index}`]}
                  placeholder="3"
                />
              </View>
              <View className="flex-[2]">
                <WorkoutField
                  label="Repetitions"
                  value={exercise.repetitions}
                  onChangeText={(value) =>
                    updateExercise(index, "repetitions", value)
                  }
                  maxLength={32}
                  error={errors[`repetitions-${index}`]}
                  placeholder="8 to 12"
                />
              </View>
            </View>
            <WorkoutField
              label="Instruction, optional"
              value={exercise.instruction}
              onChangeText={(value) =>
                updateExercise(index, "instruction", value)
              }
              maxLength={1000}
              multiline
              placeholder="Add one useful coaching cue."
            />
          </WorkoutCard>
        ))}
        {exercises.length < 12 ? (
          <WorkoutButton
            label="Add another exercise"
            variant="secondary"
            onPress={() =>
              setExercises((current) => [
                ...current,
                { name: "", sets: "3", repetitions: "", instruction: "" },
              ])
            }
          />
        ) : null}
      </View>

      <WorkoutButton
        label={
          mutation.isPending
            ? "Saving workout"
            : assignment
              ? "Save changes"
              : actor.previewRole
                ? "Assign to Mika"
                : athleteAccountId
                  ? `Assign to ${
                      rosterAthletes.find(
                        (athlete) =>
                          athlete.athleteAccountId === athleteAccountId,
                      )?.displayName ?? "Athlete"
                    }`
                  : "Select an Athlete"
        }
        disabled={
          mutation.isPending ||
          (!assignment && !actor.previewRole && rosterAthletes.length === 0)
        }
        onPress={save}
      />
    </WorkoutScreen>
  );
}

export function WorkoutEditorScreen({
  assignmentId,
}: {
  assignmentId?: string;
}) {
  const { actor, ready } = useWorkoutActor("Coach");
  const detail = useWorkoutDetail(actor, ready, assignmentId ?? "");
  const assignment = assignmentId ? (detail.data ?? null) : null;
  const contentKey = useMemo(
    () => assignment?.updatedAt ?? "new",
    [assignment],
  );

  if (!actor || !ready || (assignmentId && detail.isPending)) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Loading workout editor" />
      </WorkoutScreen>
    );
  }
  if (assignmentId && (detail.isError || !assignment)) {
    return (
      <WorkoutScreen>
        <WorkoutMessage
          tone="error"
          title="Workout unavailable"
          message={
            detail.error instanceof Error
              ? detail.error.message
              : "This workout could not be opened."
          }
          actionLabel="Try again"
          onAction={() => void detail.refetch()}
        />
      </WorkoutScreen>
    );
  }
  return (
    <WorkoutEditorContent
      key={contentKey}
      actor={actor}
      assignment={assignment}
      refresh={() => void detail.refetch()}
    />
  );
}
