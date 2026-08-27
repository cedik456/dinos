import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  workoutApi,
  type WorkoutDetail,
  type WorkoutListFilters,
  type WorkoutPage,
  type WorkoutUpsertInput,
} from "@/features/workouts/workout-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";
import { weeklyProgressKeys } from "@/features/weekly-progress/weekly-progress-queries";

export const workoutKeys = {
  root: (actor: WorkoutActor) =>
    ["workoutAssignments", actor.accountId, actor.role] as const,
  list: (actor: WorkoutActor, filters: WorkoutListFilters) =>
    [
      ...workoutKeys.root(actor),
      "list",
      Object.fromEntries(
        Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)),
      ),
    ] as const,
  detail: (actor: WorkoutActor, id: string) =>
    [...workoutKeys.root(actor), "detail", id] as const,
};

export function workoutListOptions(
  actor: WorkoutActor,
  filters: WorkoutListFilters,
) {
  return queryOptions({
    queryKey: workoutKeys.list(actor, filters),
    queryFn: ({ signal }) => workoutApi.list(actor, filters, signal),
  });
}

export function useWorkoutList(
  actor: WorkoutActor | null,
  ready: boolean,
  filters: WorkoutListFilters,
) {
  return useQuery<WorkoutPage>({
    queryKey: actor
      ? workoutKeys.list(actor, filters)
      : ["workoutAssignments", "unavailable", filters],
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("Workout actor unavailable.");
      return workoutApi.list(actor, filters, signal);
    },
    enabled: Boolean(actor && ready),
  });
}

export function useWorkoutDetail(
  actor: WorkoutActor | null,
  ready: boolean,
  id: string,
) {
  return useQuery({
    queryKey: actor
      ? workoutKeys.detail(actor, id)
      : ["workoutAssignments", "unavailable", id],
    queryFn: ({ signal }) => workoutApi.detail(actor!, id, signal),
    enabled: Boolean(actor && ready && id),
  });
}

export async function refreshWorkoutQueries(
  queryClient: Pick<QueryClient, "setQueryData" | "invalidateQueries">,
  actor: WorkoutActor,
  detail: WorkoutDetail,
) {
  queryClient.setQueryData(workoutKeys.detail(actor, detail.id), detail);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: workoutKeys.root(actor) }),
    queryClient.invalidateQueries({
      queryKey: weeklyProgressKeys.root(actor),
    }),
  ]);
}

function useRefreshWorkout(actor: WorkoutActor) {
  const queryClient = useQueryClient();
  return (detail: WorkoutDetail) =>
    refreshWorkoutQueries(queryClient, actor, detail);
}

export function useCreateWorkout(actor: WorkoutActor) {
  const refresh = useRefreshWorkout(actor);
  return useMutation({
    mutationFn: (input: WorkoutUpsertInput) => workoutApi.create(actor, input),
    onSuccess: refresh,
  });
}

export function useEditWorkout(actor: WorkoutActor, id: string) {
  const refresh = useRefreshWorkout(actor);
  return useMutation({
    mutationFn: (input: WorkoutUpsertInput) =>
      workoutApi.edit(actor, id, input),
    onSuccess: refresh,
  });
}

export function useCompleteWorkout(actor: WorkoutActor, id: string) {
  const refresh = useRefreshWorkout(actor);
  return useMutation({
    mutationFn: (note: string) => workoutApi.complete(actor, id, note),
    onSuccess: refresh,
  });
}

export function useReviewWorkout(actor: WorkoutActor, id: string) {
  const refresh = useRefreshWorkout(actor);
  return useMutation({
    mutationFn: (response: string) => workoutApi.review(actor, id, response),
    onSuccess: refresh,
  });
}
