import { useRouter } from "expo-router";

import { Text, View } from "@/components/ui/tw";
import type { WorkoutSummary } from "@/features/workouts/workout-api";
import type {
  WorkoutActor,
  WorkoutRole,
} from "@/features/workouts/workout-auth";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import { useWorkoutList } from "@/features/workouts/workout-queries";

function PlanSection({
  title,
  items,
  open,
}: {
  title: string;
  items: WorkoutSummary[] | undefined;
  open: (id: string) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <View className="gap-md">
      <Text className="font-sans text-heading font-bold text-foreground">
        {title}
      </Text>
      {items.map((workout) => (
        <WorkoutSummaryCard
          key={workout.id}
          workout={workout}
          onOpen={() => open(workout.id)}
        />
      ))}
    </View>
  );
}

function PlanContent({ actor }: { actor: WorkoutActor }) {
  const router = useRouter();
  const offline = useWorkoutOffline();
  const today = useWorkoutList(actor, true, { relative: "today" });
  const upcoming = useWorkoutList(actor, true, {
    relative: "upcoming",
    direction: "asc",
  });
  const past = useWorkoutList(actor, true, {
    relative: "past",
    direction: "desc",
  });
  const queries = [today, upcoming, past];
  const firstLoad = queries.some((query) => query.isPending);
  const hasData = queries.some((query) => query.data);
  const unavailable = offline || queries.some((query) => query.isError);
  const total = queries.reduce(
    (count, query) => count + (query.data?.items.length ?? 0),
    0,
  );
  const retry = () => queries.forEach((query) => void query.refetch());
  const open = (id: string) => router.push(`/athlete/plan/${id}`);

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Athlete plan"
        title="Your workouts"
        description="Start with today. Future sessions stay readable so you can prepare without completing early."
      />
      {firstLoad && !hasData && !unavailable ? (
        <WorkoutLoading label="Loading your plan" />
      ) : null}
      {unavailable && !hasData ? (
        <WorkoutMessage
          tone="error"
          title="Your plan is unavailable"
          message="Dino could not reach the workout service. No completion has been recorded."
          actionLabel="Try again"
          onAction={retry}
        />
      ) : null}
      {unavailable && hasData ? (
        <WorkoutMessage
          tone="stale"
          title="Showing your last saved plan"
          message="This information may be out of date. You need a connection to complete a workout."
          actionLabel="Retry"
          onAction={retry}
        />
      ) : null}
      {!firstLoad && !unavailable && total === 0 ? (
        <WorkoutMessage
          title="No workouts on your plan"
          message="Your Coach has not assigned a dated workout yet."
        />
      ) : null}
      <PlanSection title="Today" items={today.data?.items} open={open} />
      <PlanSection title="Upcoming" items={upcoming.data?.items} open={open} />
      <PlanSection title="Past" items={past.data?.items} open={open} />
    </WorkoutScreen>
  );
}

export function AthletePlanScreen() {
  const role: WorkoutRole = "Athlete";
  const { actor, ready } = useWorkoutActor(role);
  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing Athlete plan" />
      </WorkoutScreen>
    );
  }
  return <PlanContent actor={actor} />;
}
