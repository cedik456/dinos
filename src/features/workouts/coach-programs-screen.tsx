import { useRouter } from "expo-router";

import { Text, View } from "@/components/ui/tw";
import type { WorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutButton,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import { useWorkoutList } from "@/features/workouts/workout-queries";

function ProgramsContent({ actor }: { actor: WorkoutActor }) {
  const router = useRouter();
  const offline = useWorkoutOffline();
  const today = useWorkoutList(actor, true, {
    relative: "today",
    direction: "asc",
  });
  const upcoming = useWorkoutList(actor, true, {
    relative: "upcoming",
    direction: "asc",
  });
  const firstLoad = today.isPending || upcoming.isPending;
  const hasData = Boolean(today.data || upcoming.data);
  const unavailable = offline || today.isError || upcoming.isError;
  const assignments = [
    ...(today.data?.items ?? []),
    ...(upcoming.data?.items ?? []),
  ].sort(
    (a, b) =>
      a.assignedDate.localeCompare(b.assignedDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach workspace"
        title="Programs"
        description="Build Mika’s next clear session, then keep assigned work current until completion."
      />
      <WorkoutButton
        label="Create and assign workout"
        onPress={() => router.push("/coach/programs/new")}
      />
      {firstLoad && !hasData && !unavailable ? (
        <WorkoutLoading label="Loading assigned workouts" />
      ) : null}
      {unavailable && !hasData ? (
        <WorkoutMessage
          tone="error"
          title="Programs are unavailable"
          message="Dino could not load assigned workouts. Your saved data is unchanged."
          actionLabel="Try again"
          onAction={() => {
            void today.refetch();
            void upcoming.refetch();
          }}
        />
      ) : null}
      {unavailable && hasData ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved view"
          message="Dino is offline or the workout service is unavailable. Changes are not queued."
          actionLabel="Retry"
          onAction={() => {
            void today.refetch();
            void upcoming.refetch();
          }}
        />
      ) : null}
      {!firstLoad && !unavailable && assignments.length === 0 ? (
        <WorkoutMessage
          title="No workouts assigned yet"
          message="Create Mika’s first dated workout to begin the coaching loop."
          actionLabel="Create workout"
          onAction={() => router.push("/coach/programs/new")}
        />
      ) : null}
      {assignments.length > 0 ? (
        <View className="gap-md">
          <View className="flex-row items-end justify-between gap-md">
            <Text className="font-sans text-heading font-bold text-foreground">
              Today and upcoming
            </Text>
            <Text className="font-sans text-label font-semibold text-accent-foreground">
              {assignments.length} scheduled
            </Text>
          </View>
          {assignments.map((workout) => (
            <WorkoutSummaryCard
              key={workout.id}
              workout={workout}
              onOpen={() => router.push(`/coach/programs/${workout.id}`)}
              onEdit={() => router.push(`/coach/programs/${workout.id}/edit`)}
            />
          ))}
        </View>
      ) : null}
    </WorkoutScreen>
  );
}

export function CoachProgramsScreen() {
  const { actor, ready } = useWorkoutActor("Coach");
  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing Coach programs" />
      </WorkoutScreen>
    );
  }
  return <ProgramsContent actor={actor} />;
}
