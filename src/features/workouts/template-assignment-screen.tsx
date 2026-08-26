import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { Text, View } from "@/components/ui/tw";
import { useRosterAthletes } from "@/features/roster/roster-queries";
import type { WorkoutTemplate } from "@/features/workouts/template-api";
import { useTemplateDetail } from "@/features/workouts/template-queries";
import {
  useWorkoutActor,
  type WorkoutActor,
} from "@/features/workouts/workout-auth";
import { WorkoutApiError } from "@/features/workouts/workout-api";
import {
  WorkoutButton,
  WorkoutCard,
  WorkoutField,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import { useCreateWorkout } from "@/features/workouts/workout-queries";

type ExerciseDraft = {
  id: string;
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

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function TemplateAssignmentContent({
  actor,
  template,
}: {
  actor: WorkoutActor;
  template: WorkoutTemplate;
}) {
  const router = useRouter();
  const roster = useRosterAthletes(actor, true);
  const rosterAthletes = useMemo(
    () => roster.data?.pages.flatMap((page) => page.items) ?? [],
    [roster.data],
  );
  const [athleteAccountId, setAthleteAccountId] = useState("");
  const [assignedDate, setAssignedDate] = useState(deviceDate());
  const [overviewNote, setOverviewNote] = useState(template.overviewNote ?? "");
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    template.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: String(exercise.sets),
      repetitions: exercise.repetitions,
      instruction: exercise.instruction ?? "",
    })),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const create = useCreateWorkout(actor);

  useEffect(() => {
    if (!actor.previewRole && !athleteAccountId && rosterAthletes[0]) {
      setAthleteAccountId(rosterAthletes[0].athleteAccountId);
    }
  }, [actor.previewRole, athleteAccountId, rosterAthletes]);

  const updateExercise = (
    id: string,
    field: "sets" | "repetitions" | "instruction",
    value: string,
  ) => {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, [field]: value } : exercise,
      ),
    );
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!actor.previewRole && !athleteAccountId) {
      next.athleteAccountId = "Select an active Athlete.";
    }
    if (!validDate(assignedDate)) {
      next.assignedDate = "Use a valid date in YYYY-MM-DD format.";
    }
    exercises.forEach((exercise) => {
      const sets = Number(exercise.sets);
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
        next[`sets-${exercise.id}`] = "Sets must be from 1 through 20.";
      }
      if (!exercise.repetitions.trim()) {
        next[`repetitions-${exercise.id}`] = "Add repetitions or a duration.";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    create.mutate(
      {
        ...(!actor.previewRole ? { athleteAccountId } : {}),
        title: template.name,
        overviewNote,
        assignedDate,
        creationTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        exercises: exercises.map((exercise) => ({
          name: exercise.name,
          sets: Number(exercise.sets),
          repetitions: exercise.repetitions,
          instruction: exercise.instruction,
        })),
      },
      { onSuccess: () => router.replace("/coach/programs") },
    );
  };

  const apiError =
    create.error instanceof WorkoutApiError ? create.error : null;
  const selectedAthlete = rosterAthletes.find(
    (athlete) => athlete.athleteAccountId === athleteAccountId,
  );

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach templates"
        title={`Assign ${template.name}`}
        description="Choose one active Athlete and date. You can adjust the prescription without changing the saved template."
      />

      {apiError ? (
        <WorkoutMessage
          tone={apiError.status === 409 ? "stale" : "error"}
          title={
            apiError.status === 409
              ? "That date is unavailable"
              : "Workout not assigned"
          }
          message={`${apiError.message} Your selections and adjustments are still here.`}
        />
      ) : null}

      {!actor.previewRole ? (
        <WorkoutCard>
          <View className="gap-xs">
            <Text className="font-sans text-heading font-bold text-foreground">
              Athlete
            </Text>
            <Text className="font-sans text-body text-muted">
              Only active Athletes in your private roster are available.
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
              message="Invite an Athlete and wait for acceptance before assigning this template."
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
              accessibilityLabel={`Assign ${template.name} to ${athlete.displayName}`}
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
            Assignment details
          </Text>
          <Text className="font-sans text-body text-muted">
            The assigned workout becomes its own copy. The template stays
            unchanged.
          </Text>
        </View>
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
          label="Coaching note, optional"
          value={overviewNote}
          onChangeText={setOverviewNote}
          maxLength={1000}
          multiline
          placeholder="Add a useful focus for this Athlete."
        />
      </WorkoutCard>

      <View className="gap-md">
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Exercise prescription
          </Text>
          <Text className="font-sans text-body text-muted">
            Exercise names and order come from the template. Adjust only what
            this Athlete needs.
          </Text>
        </View>
        {exercises.map((exercise, index) => (
          <WorkoutCard key={exercise.id}>
            <View className="gap-xs">
              <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
                Exercise {index + 1}
              </Text>
              <Text className="font-sans text-heading font-bold text-foreground">
                {exercise.name}
              </Text>
            </View>
            <View className="flex-row gap-md">
              <View className="flex-1">
                <WorkoutField
                  label="Sets"
                  value={exercise.sets}
                  onChangeText={(value) =>
                    updateExercise(exercise.id, "sets", value)
                  }
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors[`sets-${exercise.id}`]}
                  placeholder="3"
                />
              </View>
              <View className="flex-[2]">
                <WorkoutField
                  label="Repetitions or duration"
                  value={exercise.repetitions}
                  onChangeText={(value) =>
                    updateExercise(exercise.id, "repetitions", value)
                  }
                  maxLength={32}
                  error={errors[`repetitions-${exercise.id}`]}
                  placeholder="8 to 12"
                />
              </View>
            </View>
            <WorkoutField
              label="Instruction, optional"
              value={exercise.instruction}
              onChangeText={(value) =>
                updateExercise(exercise.id, "instruction", value)
              }
              maxLength={1000}
              multiline
              placeholder="Add one useful coaching cue."
            />
          </WorkoutCard>
        ))}
      </View>

      <WorkoutButton
        label={
          create.isPending
            ? "Assigning workout"
            : actor.previewRole
              ? "Assign to Mika"
              : selectedAthlete
                ? `Assign to ${selectedAthlete.displayName}`
                : "Select an Athlete"
        }
        disabled={
          create.isPending ||
          (!actor.previewRole &&
            (roster.isPending || roster.isError || rosterAthletes.length === 0))
        }
        onPress={save}
      />
    </WorkoutScreen>
  );
}

export function TemplateAssignmentScreen({
  templateId,
}: {
  templateId: string;
}) {
  const { actor, ready } = useWorkoutActor("Coach");
  const template = useTemplateDetail(actor, ready, templateId);

  if (!actor || !ready || template.isPending) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Loading workout template" />
      </WorkoutScreen>
    );
  }
  if (template.isError || !template.data) {
    return (
      <WorkoutScreen>
        <WorkoutMessage
          tone="error"
          title="Template unavailable"
          message={
            template.error instanceof Error
              ? template.error.message
              : "This workout template could not be opened."
          }
          actionLabel="Try again"
          onAction={() => void template.refetch()}
        />
      </WorkoutScreen>
    );
  }
  return (
    <TemplateAssignmentContent
      key={template.data.updatedAt}
      actor={actor}
      template={template.data}
    />
  );
}
