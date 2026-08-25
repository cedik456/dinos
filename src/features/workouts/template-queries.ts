import {
  useInfiniteQuery,
  useMutation,
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
  exercises: (actor: WorkoutActor, query: string) =>
    [...templateKeys.root(actor), "referenceExercises", query] as const,
};

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
) {
  return useInfiniteQuery({
    queryKey: actor
      ? templateKeys.exercises(actor, query)
      : ["workoutTemplates", "referenceExercises", "off", query],
    queryFn: ({ pageParam, signal }) =>
      templateApi.listExercises(actor!, query, pageParam ?? undefined, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready),
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
