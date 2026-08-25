import { useRouter } from "expo-router";

import { Text, View } from "@/components/ui/tw";
import type { WorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { TemplateCard } from "@/features/workouts/components/template-card";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutButton,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import { useWorkoutList } from "@/features/workouts/workout-queries";
import { useTemplateList } from "@/features/workouts/template-queries";

function ProgramsContent({ actor }: { actor: WorkoutActor }) {
  const router = useRouter();
  const offline = useWorkoutOffline();
  const templates = useTemplateList(actor, true);
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
  const templateItems =
    templates.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach workspace"
        title="Programs"
        description="Reuse a clear session template, then schedule dated work for each Athlete."
      />
      <WorkoutButton
        label="Create a workout template"
        onPress={() => router.push("/coach/programs/templates/new")}
      />

      <View className="gap-md">
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Workout templates
          </Text>
          <Text className="font-sans text-body text-muted">
            Start with Dino’s Full Body A or save your own exercise selection.
          </Text>
        </View>
        {templates.isPending ? (
          <WorkoutLoading label="Loading workout templates" />
        ) : null}
        {templates.isError && templateItems.length === 0 ? (
          <WorkoutMessage
            tone="error"
            title="Templates are unavailable"
            message="Dino could not load your saved templates."
            actionLabel="Try again"
            onAction={() => void templates.refetch()}
          />
        ) : null}
        {(offline || templates.isError) && templateItems.length > 0 ? (
          <WorkoutMessage
            tone="stale"
            title="Showing saved templates"
            message="Dino is offline or the template service is unavailable. New changes are not queued."
            actionLabel="Retry"
            onAction={() => void templates.refetch()}
          />
        ) : null}
        {!templates.isPending &&
        !templates.isError &&
        templateItems.length === 0 ? (
          <WorkoutMessage
            title="No templates yet"
            message="Create your first reusable workout without typing every exercise again."
            actionLabel="Create template"
            onAction={() => router.push("/coach/programs/templates/new")}
          />
        ) : null}
        {templateItems.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
        {templates.hasNextPage ? (
          <WorkoutButton
            label={
              templates.isFetchingNextPage
                ? "Loading more templates"
                : "Load more templates"
            }
            variant="secondary"
            disabled={templates.isFetchingNextPage}
            onPress={() => void templates.fetchNextPage()}
          />
        ) : null}
      </View>

      <View className="gap-xs">
        <Text className="font-sans text-heading font-bold text-foreground">
          Dated assignments
        </Text>
        <Text className="font-sans text-body text-muted">
          Assign a session to an active Athlete and keep it current through
          review.
        </Text>
      </View>
      <WorkoutButton
        label="Create and assign workout"
        variant="secondary"
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
