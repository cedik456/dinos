import { useRouter } from "expo-router";

import { Text, View } from "@/components/ui/tw";
import type { WorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutLoading,
  WorkoutMessage,
} from "@/features/workouts/components/workout-ui";
import { useWorkoutList } from "@/features/workouts/workout-queries";

function ReviewContent({ actor }: { actor: WorkoutActor }) {
  const router = useRouter();
  const offline = useWorkoutOffline();
  const query = useWorkoutList(actor, true, { awaitingReview: true });
  const unavailable = offline || query.isError;
  return (
    <View className="gap-md">
      <View className="gap-xs">
        <Text className="font-sans text-heading font-bold text-foreground">
          Awaiting your review
        </Text>
        <Text className="font-sans text-body text-muted">
          Oldest completed work appears first.
        </Text>
      </View>
      {query.isPending && !unavailable ? (
        <WorkoutLoading label="Loading review queue" />
      ) : null}
      {unavailable && !query.data ? (
        <WorkoutMessage
          tone="error"
          title="Review queue unavailable"
          message="Dino could not load completed workouts."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unavailable && query.data ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved queue"
          message="Refresh before responding to a workout."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {!query.isPending && !unavailable && query.data?.items.length === 0 ? (
        <WorkoutMessage
          title="Nothing awaiting review"
          message="Completed Athlete work will appear here."
        />
      ) : null}
      {query.data?.items.map((workout) => (
        <WorkoutSummaryCard
          key={workout.id}
          workout={workout}
          onOpen={() => router.push(`/coach/programs/${workout.id}`)}
        />
      ))}
    </View>
  );
}

export function CoachAwaitingReview() {
  const { actor, ready } = useWorkoutActor("Coach");
  if (!actor || !ready)
    return <WorkoutLoading label="Preparing review queue" />;
  return <ReviewContent actor={actor} />;
}
