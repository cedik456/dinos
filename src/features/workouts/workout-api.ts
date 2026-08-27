import { fetch } from "expo/fetch";

import type { WorkoutActor } from "@/features/workouts/workout-auth";

export type WorkoutStatus = "assigned" | "completed" | "reviewed";
export type WorkoutDateRelation = "past" | "today" | "future";

export type WorkoutExerciseInput = {
  referenceExerciseId: string;
  sets: number;
  repetitions: string;
};

export type WorkoutUpsertInput = {
  athleteAccountId?: string;
  title: string;
  overviewNote?: string | null;
  assignedDate: string;
  creationTimeZone?: string;
  exercises: WorkoutExerciseInput[];
};

export type WorkoutSummary = {
  id: string;
  title: string;
  assignedDate: string;
  dateRelation: WorkoutDateRelation;
  status: WorkoutStatus;
  coach: { id: string; displayName: string };
  athlete: { id: string; displayName: string };
  exerciseCount: number;
  completedAt: string | null;
  reviewedAt: string | null;
  awaitingReview: boolean;
  createdAt: string;
  updatedAt: string;
  actions: { canEdit: boolean; canComplete: boolean; canReview: boolean };
};

export type WorkoutDetail = WorkoutSummary & {
  overviewNote: string | null;
  creationTimeZone: string;
  exercises: {
    id: string;
    referenceExerciseId: string | null;
    position: number;
    name: string;
    sets: number;
    repetitions: string;
    illustrationFrames:
      | {
          index: 1 | 2 | 3;
          url: string;
          width: number;
          height: number;
        }[]
      | null;
    illustrationAttribution: {
      creator: string;
      creatorUrl: string;
      license: string;
      licenseUrl: string;
    } | null;
    video: {
      provider: "youtube" | "vimeo";
      videoId: string;
      creatorName: string;
      sourceUrl: string;
    } | null;
  }[];
  completion: { note: string | null; completedAt: string } | null;
  review: { response: string | null; reviewedAt: string } | null;
};

export type WorkoutPage = {
  items: WorkoutSummary[];
  nextCursor: string | null;
};

export type WorkoutListFilters = Partial<{
  cursor: string;
  limit: number;
  status: WorkoutStatus;
  dateFrom: string;
  dateTo: string;
  relative: "today" | "upcoming" | "past";
  awaitingReview: boolean;
  direction: "asc" | "desc";
}>;

export class WorkoutApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "WorkoutApiError";
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

async function actorHeaders(
  actor: WorkoutActor,
): Promise<Record<string, string>> {
  if (actor.previewRole) return { "X-Dino-Preview-Role": actor.previewRole };
  const token = await actor.getToken?.();
  if (!token)
    throw new WorkoutApiError(
      "Authentication is required.",
      401,
      "AUTH_REQUIRED",
    );
  return { Authorization: `Bearer ${token}` };
}

export async function workoutRequest<T>(
  actor: WorkoutActor,
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (!baseUrl) {
    throw new WorkoutApiError(
      "The Dino API URL is not configured.",
      0,
      "API_URL_MISSING",
    );
  }
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(await actorHeaders(actor)),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.ok) {
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    }
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      requestId?: string;
    } | null;
    throw new WorkoutApiError(
      payload?.message ?? "The workout request failed.",
      response.status,
      payload?.code ?? "REQUEST_FAILED",
      payload?.requestId,
    );
  } catch (error) {
    if (error instanceof WorkoutApiError || error instanceof DOMException)
      throw error;
    throw new WorkoutApiError(
      "Dino could not reach the workout service.",
      0,
      "NETWORK_ERROR",
    );
  }
}

function queryString(filters: WorkoutListFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (value !== undefined) params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const workoutApi = {
  list: (
    actor: WorkoutActor,
    filters: WorkoutListFilters,
    signal?: AbortSignal,
  ) =>
    workoutRequest<WorkoutPage>(
      actor,
      `/workout-assignments${queryString(filters)}`,
      {
        signal,
      },
    ),
  detail: (actor: WorkoutActor, id: string, signal?: AbortSignal) =>
    workoutRequest<WorkoutDetail>(actor, `/workout-assignments/${id}`, {
      signal,
    }),
  create: (actor: WorkoutActor, input: WorkoutUpsertInput) =>
    workoutRequest<WorkoutDetail>(actor, "/workout-assignments", {
      method: "POST",
      body: input,
    }),
  edit: (actor: WorkoutActor, id: string, input: WorkoutUpsertInput) =>
    workoutRequest<WorkoutDetail>(actor, `/workout-assignments/${id}`, {
      method: "PATCH",
      body: input,
    }),
  complete: (actor: WorkoutActor, id: string, note: string) =>
    workoutRequest<WorkoutDetail>(
      actor,
      `/workout-assignments/${id}/complete`,
      {
        method: "POST",
        body: { note },
      },
    ),
  review: (actor: WorkoutActor, id: string, response: string) =>
    workoutRequest<WorkoutDetail>(actor, `/workout-assignments/${id}/review`, {
      method: "POST",
      body: { response },
    }),
};
