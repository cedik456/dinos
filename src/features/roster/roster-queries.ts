import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { rosterApi } from "@/features/roster/roster-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export const rosterKeys = {
  root: (actor: WorkoutActor) => ["roster", actor.accountId] as const,
  invitations: (actor: WorkoutActor) =>
    [...rosterKeys.root(actor), "invitations"] as const,
  athletes: (actor: WorkoutActor) =>
    [...rosterKeys.root(actor), "athletes"] as const,
};

export function useRosterInvitations(
  actor: WorkoutActor | null,
  ready: boolean,
) {
  return useInfiniteQuery({
    queryKey: actor
      ? rosterKeys.invitations(actor)
      : ["roster", "unavailable", "invitations"],
    queryFn: ({ pageParam, signal }) =>
      rosterApi.invitations(actor!, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready && !actor.previewRole),
  });
}

export function useRosterAthletes(actor: WorkoutActor | null, ready: boolean) {
  return useInfiniteQuery({
    queryKey: actor
      ? rosterKeys.athletes(actor)
      : ["roster", "unavailable", "athletes"],
    queryFn: ({ pageParam, signal }) =>
      rosterApi.athletes(actor!, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready && !actor.previewRole),
  });
}

export function useMineRosterInvitation(
  actor: WorkoutActor | null,
  ready: boolean,
) {
  return useQuery({
    queryKey: actor
      ? [...rosterKeys.root(actor), "mine"]
      : ["roster", "unavailable", "mine"],
    queryFn: ({ signal }) => rosterApi.mineForActor(actor!, signal),
    enabled: Boolean(actor && ready && !actor.previewRole),
    retry: false,
  });
}

function useRefreshRoster(actor: WorkoutActor) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: rosterKeys.root(actor) });
}

export function useCreateRosterInvitation(actor: WorkoutActor) {
  const refresh = useRefreshRoster(actor);
  return useMutation({
    mutationFn: (email: string) => rosterApi.create(actor, email),
    onSuccess: refresh,
  });
}

export function useResendRosterInvitation(actor: WorkoutActor) {
  const refresh = useRefreshRoster(actor);
  return useMutation({
    mutationFn: (id: string) => rosterApi.resend(actor, id),
    onSuccess: refresh,
  });
}

export function useRevokeRosterInvitation(actor: WorkoutActor) {
  const refresh = useRefreshRoster(actor);
  return useMutation({
    mutationFn: (id: string) => rosterApi.revoke(actor, id),
    onSuccess: refresh,
  });
}
