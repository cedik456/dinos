import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  templateApi,
  type TemplateCreateInput,
} from "@/features/workouts/template-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export const templateKeys = {
  root: (actor: WorkoutActor) =>
    ["workoutTemplates", actor.accountId, actor.role] as const,
  list: (actor: WorkoutActor) => [...templateKeys.root(actor), "list"] as const,
  detail: (actor: WorkoutActor, id: string) =>
    [...templateKeys.root(actor), "detail", id] as const,
  exercises: (
    actor: WorkoutActor,
    query: string,
    equipment = "",
    primaryMuscle = "",
  ) =>
    [
      ...templateKeys.root(actor),
      "referenceExercises",
      query,
      equipment,
      primaryMuscle,
    ] as const,
};

export function useTemplateDetail(
  actor: WorkoutActor | null,
  ready: boolean,
  id: string,
) {
  return useQuery({
    queryKey: actor
      ? templateKeys.detail(actor, id)
      : ["workoutTemplates", "detail", "off", id],
    queryFn: ({ signal }) => templateApi.detail(actor!, id, signal),
    enabled: Boolean(actor && ready && id),
  });
}

export function useTemplateList(actor: WorkoutActor | null, ready: boolean) {
  return useInfiniteQuery({
    queryKey: actor ? templateKeys.list(actor) : ["workoutTemplates", "off"],
    queryFn: ({ pageParam, signal }) =>
      templateApi.listTemplates(actor!, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready),
  });
}

export function useReferenceExercises(
  actor: WorkoutActor | null,
  ready: boolean,
  query: string,
  filters: { equipment?: string; primaryMuscle?: string } = {},
) {
  return useInfiniteQuery({
    queryKey: actor
      ? templateKeys.exercises(
          actor,
          query,
          filters.equipment,
          filters.primaryMuscle,
        )
      : ["workoutTemplates", "referenceExercises", "off", query],
    queryFn: ({ pageParam, signal }) =>
      templateApi.listExercises(
        actor!,
        query,
        filters,
        pageParam ?? undefined,
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready),
  });
}

export function usePreviewExerciseVideo(actor: WorkoutActor) {
  return useMutation({
    mutationFn: (url: string) => templateApi.previewVideo(actor, url),
  });
}

export function useSaveExerciseVideo(actor: WorkoutActor) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      referenceExerciseId,
      url,
      creatorName,
    }: {
      referenceExerciseId: string;
      url: string;
      creatorName: string;
    }) =>
      templateApi.saveVideo(actor, referenceExerciseId, {
        url,
        creatorName,
        rightsConfirmed: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: templateKeys.root(actor),
      });
    },
  });
}

export function useRemoveExerciseVideo(actor: WorkoutActor) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (referenceExerciseId: string) =>
      templateApi.removeVideo(actor, referenceExerciseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: templateKeys.root(actor),
      });
    },
  });
}

export function useCreateTemplate(actor: WorkoutActor) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateCreateInput) =>
      templateApi.create(actor, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: templateKeys.root(actor),
      });
    },
  });
}
