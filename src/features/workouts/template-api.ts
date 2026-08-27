import { fetch } from "expo/fetch";

import type { WorkoutActor } from "@/features/workouts/workout-auth";

export type ReferenceExercise = {
  id: string;
  name: string;
  exerciseType: string;
  equipment: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  isStretch: boolean;
  illustrationFrames: ExerciseIllustrationFrame[];
  illustrationAttribution: ExerciseIllustrationAttribution;
  currentVideo: ExerciseVideo | null;
};

export type ExerciseIllustrationFrame = {
  index: 1 | 2 | 3;
  url: string;
  width: number;
  height: number;
};

export type ExerciseIllustrationAttribution = {
  creator: string;
  creatorUrl: string;
  license: string;
  licenseUrl: string;
};

export type ExerciseVideoPreview = {
  provider: "youtube" | "vimeo";
  videoId: string;
  canonicalSourceUrl: string;
  embedUrl: string;
};

export type ExerciseVideo = ExerciseVideoPreview & { creatorName: string };

export type TemplateExerciseInput = {
  referenceExerciseId: string;
  sets: number;
  repetitions: string;
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
    currentVideo: ExerciseVideo | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type TemplatePage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ReferenceExercisePage = TemplatePage<ReferenceExercise> & {
  filters: { equipment: string[]; primaryMuscle: string[] };
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
    if (response.ok) {
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    }
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
    filters: { equipment?: string; primaryMuscle?: string } = {},
    cursor?: string,
    signal?: AbortSignal,
  ) =>
    request<ReferenceExercisePage>(
      actor,
      `/reference-exercises${queryString({
        q: query,
        equipment: filters.equipment,
        primaryMuscle: filters.primaryMuscle,
        cursor,
        limit: 20,
      })}`,
      { signal },
    ),
  detail: (actor: WorkoutActor, id: string, signal?: AbortSignal) =>
    request<WorkoutTemplate>(actor, `/workout-templates/${id}`, { signal }),
  create: (actor: WorkoutActor, input: TemplateCreateInput) =>
    request<WorkoutTemplate>(actor, "/workout-templates", {
      method: "POST",
      body: input,
    }),
  previewVideo: (actor: WorkoutActor, url: string) =>
    request<ExerciseVideoPreview>(actor, "/reference-exercises/video-preview", {
      method: "POST",
      body: { url },
    }),
  saveVideo: (
    actor: WorkoutActor,
    referenceExerciseId: string,
    input: { url: string; creatorName: string; rightsConfirmed: true },
  ) =>
    request<ExerciseVideo>(
      actor,
      `/reference-exercises/${referenceExerciseId}/video`,
      { method: "PUT", body: input },
    ),
  removeVideo: (actor: WorkoutActor, referenceExerciseId: string) =>
    request<void>(actor, `/reference-exercises/${referenceExerciseId}/video`, {
      method: "DELETE",
    }),
};
