import { useRouter } from "expo-router";
import { useState } from "react";

import { Text, View } from "@/components/ui/tw";
import {
  WorkoutApiError,
  type WorkoutDetail,
} from "@/features/workouts/workout-api";
import {
  useWorkoutActor,
  type WorkoutActor,
  type WorkoutRole,
} from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  formatWorkoutDate,
  WorkoutButton,
  WorkoutCard,
  WorkoutField,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
  WorkoutStatusBadge,
} from "@/features/workouts/components/workout-ui";
import {
  useCompleteWorkout,
  useReviewWorkout,
  useWorkoutDetail,
} from "@/features/workouts/workout-queries";

function LifecycleAction({
  actor,
  workout,
  refresh,
}: {
  actor: WorkoutActor;
  workout: WorkoutDetail;
  refresh: () => void;
}) {
  const [note, setNote] = useState(workout.completion?.note ?? "");
  const [response, setResponse] = useState(workout.review?.response ?? "");
  const completion = useCompleteWorkout(actor, workout.id);
  const review = useReviewWorkout(actor, workout.id);
  const mutation = actor.role === "Athlete" ? completion : review;
  const error =
    mutation.error instanceof WorkoutApiError ? mutation.error : null;

  if (!workout.actions.canComplete && !workout.actions.canReview) return null;
  const isCompletion = workout.actions.canComplete;
  const submit = () => {
    if (isCompletion) completion.mutate(note);
    else review.mutate(response);
  };

  return (
    <WorkoutCard className="border-accent bg-accent-soft">
      <View className="gap-xs">
        <Text className="font-sans text-heading font-bold text-foreground">
          {isCompletion ? "Finish today’s workout" : "Close the coaching loop"}
        </Text>
        <Text className="font-sans text-body text-muted">
          {isCompletion
            ? "Your completion time is recorded by Dino when the save succeeds."
            : "Add one useful response, then mark this workout reviewed."}
        </Text>
      </View>
      <WorkoutField
        label={
          isCompletion ? "Athlete note, optional" : "Coach response, optional"
        }
        value={isCompletion ? note : response}
        onChangeText={isCompletion ? setNote : setResponse}
        maxLength={1000}
        multiline
        placeholder={
          isCompletion
            ? "How did the session feel?"
            : "What should Mika carry forward?"
        }
      />
      {error ? (
        <WorkoutMessage
          tone={error.status === 409 ? "stale" : "error"}
          title={
            error.status === 409 ? "The workout changed" : "Nothing was saved"
          }
          message={error.message}
          actionLabel={error.status === 409 ? "Refresh workout" : undefined}
          onAction={error.status === 409 ? refresh : undefined}
        />
      ) : null}
      <WorkoutButton
        label={
          mutation.isPending
            ? "Saving"
            : isCompletion
              ? "Mark workout complete"
              : "Respond and mark reviewed"
        }
        disabled={mutation.isPending}
        onPress={submit}
      />
    </WorkoutCard>
  );
}

function DetailContent({
  actor,
  workout,
  refresh,
  stale,
}: {
  actor: WorkoutActor;
  workout: WorkoutDetail;
  refresh: () => void;
  stale: boolean;
}) {
  const router = useRouter();
  return (
    <WorkoutScreen>
      <WorkoutButton
        label="Back"
        variant="ghost"
        onPress={() => router.back()}
      />
      <WorkoutHeader
        eyebrow={`${actor.role} workout`}
        title={workout.title}
        description={`${formatWorkoutDate(workout.assignedDate)} · ${workout.exerciseCount} ${
          workout.exerciseCount === 1 ? "exercise" : "exercises"
        }`}
      />
      {stale ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved workout"
          message="Actions stay unavailable until Dino refreshes this workout."
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : null}
      <WorkoutCard>
        <View className="flex-row items-start justify-between gap-md">
          <View className="min-w-0 flex-1 gap-xs">
            <Text className="font-sans text-label font-semibold text-muted">
              ASSIGNED BY {workout.coach.displayName.toUpperCase()}
            </Text>
            <Text className="font-sans text-title font-bold text-foreground">
              {formatWorkoutDate(workout.assignedDate)}
            </Text>
          </View>
          <WorkoutStatusBadge status={workout.status} />
        </View>
        {workout.overviewNote ? (
          <Text className="font-sans text-body text-muted">
            {workout.overviewNote}
          </Text>
        ) : null}
        {actor.role === "Coach" && workout.actions.canEdit && !stale ? (
          <WorkoutButton
            label="Edit assigned workout"
            variant="secondary"
            onPress={() => router.push(`/coach/programs/${workout.id}/edit`)}
          />
        ) : null}
      </WorkoutCard>

      <View className="gap-md">
        <Text className="font-sans text-heading font-bold text-foreground">
          Session plan
        </Text>
        {workout.exercises.map((exercise) => (
          <WorkoutCard key={exercise.id}>
            <View className="flex-row items-start gap-md">
              <View className="size-10 items-center justify-center rounded-medium bg-accent-soft">
                <Text className="font-sans text-label font-bold text-accent-foreground">
                  {exercise.position}
                </Text>
              </View>
              <View className="min-w-0 flex-1 gap-xs">
                <Text className="font-sans text-heading font-bold text-foreground">
                  {exercise.name}
                </Text>
                <Text className="font-sans text-body font-semibold text-accent-foreground">
                  {exercise.sets} sets · {exercise.repetitions}
                </Text>
                {exercise.instruction ? (
                  <Text className="font-sans text-body text-muted">
                    {exercise.instruction}
                  </Text>
                ) : null}
              </View>
            </View>
          </WorkoutCard>
        ))}
      </View>

      {workout.completion ? (
        <WorkoutCard>
          <Text className="font-sans text-label font-semibold text-accent-foreground">
            ATHLETE COMPLETION
          </Text>
          <Text className="font-sans text-body text-muted">
            {workout.completion.note || "Completed without a note."}
          </Text>
        </WorkoutCard>
      ) : null}

      {workout.review ? (
        <WorkoutCard className="border-success bg-success-soft">
          <Text className="font-sans text-label font-semibold text-success">
            COACH REVIEW
          </Text>
          <Text className="font-sans text-body text-foreground">
            {workout.review.response ||
              "Reviewed without an additional response."}
          </Text>
        </WorkoutCard>
      ) : null}

      {!stale ? (
        <LifecycleAction actor={actor} workout={workout} refresh={refresh} />
      ) : null}
    </WorkoutScreen>
  );
}

export function WorkoutDetailScreen({
  id,
  role,
}: {
  id: string;
  role: WorkoutRole;
}) {
  const { actor, ready } = useWorkoutActor(role);
  const offline = useWorkoutOffline();
  const detail = useWorkoutDetail(actor, ready, id);
  const unavailable = offline || detail.isError;
  if (!actor || !ready || (detail.isPending && !unavailable)) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Loading workout details" />
      </WorkoutScreen>
    );
  }
  if (unavailable && !detail.data) {
    return (
      <WorkoutScreen>
        <WorkoutMessage
          tone="error"
          title={offline ? "Workout unavailable" : "Workout not found"}
          message={
            offline
              ? "Dino could not reach the workout service."
              : detail.error instanceof Error
                ? detail.error.message
                : "This workout is unavailable."
          }
          actionLabel="Try again"
          onAction={() => void detail.refetch()}
        />
      </WorkoutScreen>
    );
  }
  return (
    <DetailContent
      actor={actor}
      workout={detail.data!}
      stale={unavailable}
      refresh={() => void detail.refetch()}
    />
  );
}
