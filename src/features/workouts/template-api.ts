import { fetch } from "expo/fetch";

import type { WorkoutActor } from "@/features/workouts/workout-auth";

export type ReferenceExercise = {
  id: string;
  name: string;
  defaultSets: number;
  defaultRepetitions: string;
  instruction: string | null;
};

export type TemplateExerciseInput = {
  referenceExerciseId: string;
  sets: number;
  repetitions: string;
  instruction?: string | null;
};

export type TemplateCreateInput = {
  name: string;
  overviewNote?: string | null;
  exercises: TemplateExerciseInput[];
};

export type WorkoutTemplate = {
  id: string;
  scope: "Dino" | "Coach";
  name: string;
  overviewNote: string | null;
  exerciseCount: number;
  exercises: {
    id: string;
    referenceExerciseId: string;
    position: number;
    name: string;
    sets: number;
    repetitions: string;
    instruction: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type TemplatePage<T> = {
  items: T[];
  nextCursor: string | null;
};

export class TemplateApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "TemplateApiError";
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

async function actorHeaders(
  actor: WorkoutActor,
): Promise<Record<string, string>> {
  if (actor.previewRole) return { "X-Dino-Preview-Role": actor.previewRole };
  const token = await actor.getToken?.();
  if (!token) {
    throw new TemplateApiError(
      "Authentication is required.",
      401,
      "AUTH_REQUIRED",
    );
  }
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  actor: WorkoutActor,
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
) {
  if (!baseUrl) {
    throw new TemplateApiError(
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
    if (response.ok) return (await response.json()) as T;
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      requestId?: string;
    } | null;
    throw new TemplateApiError(
      payload?.message ?? "The template request failed.",
      response.status,
      payload?.code ?? "REQUEST_FAILED",
      payload?.requestId,
    );
  } catch (error) {
    if (error instanceof TemplateApiError || error instanceof DOMException) {
      throw error;
    }
    throw new TemplateApiError(
      "Dino could not reach the template service.",
      0,
      "NETWORK_ERROR",
    );
  }
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const templateApi = {
  listTemplates: (actor: WorkoutActor, cursor?: string, signal?: AbortSignal) =>
    request<TemplatePage<WorkoutTemplate>>(
      actor,
      `/workout-templates${queryString({ cursor, limit: 20 })}`,
      { signal },
    ),
  listExercises: (
    actor: WorkoutActor,
    query: string,
    cursor?: string,
    signal?: AbortSignal,
  ) =>
    request<TemplatePage<ReferenceExercise>>(
      actor,
      `/reference-exercises${queryString({ q: query, cursor, limit: 20 })}`,
      { signal },
    ),
  create: (actor: WorkoutActor, input: TemplateCreateInput) =>
    request<WorkoutTemplate>(actor, "/workout-templates", {
      method: "POST",
      body: input,
    }),
};
