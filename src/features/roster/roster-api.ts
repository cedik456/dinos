import { fetch } from "expo/fetch";

import type { WorkoutActor } from "@/features/workouts/workout-auth";

export type RosterInvitationStatus =
  "sending" | "pending" | "failed" | "accepted" | "revoked" | "expired";

export type RosterInvitation = {
  id: string;
  email: string;
  status: RosterInvitationStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RosterInvitationPage = {
  items: RosterInvitation[];
  nextCursor: string | null;
};

export type RosterAthlete = {
  relationshipId: string;
  athleteAccountId: string;
  displayName: string;
  startedAt: string;
};

export type RosterAthletePage = {
  items: RosterAthlete[];
  nextCursor: string | null;
};

export type MineInvitation = {
  id: string;
  coachDisplayName: string;
  expiresAt: string | null;
  status: "pending";
};

export class RosterApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "RosterApiError";
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

async function actorToken(actor: WorkoutActor): Promise<string> {
  const token = await actor.getToken?.();
  if (!token) {
    throw new RosterApiError(
      "Authentication is required.",
      401,
      "AUTH_REQUIRED",
    );
  }
  return token;
}

async function request<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (!baseUrl) {
    throw new RosterApiError(
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
        Authorization: `Bearer ${token}`,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.ok) return (await response.json()) as T;
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      requestId?: string;
    };
    throw new RosterApiError(
      body.message ?? "The roster request failed.",
      response.status,
      body.code ?? "REQUEST_FAILED",
      body.requestId,
    );
  } catch (error) {
    if (error instanceof RosterApiError || error instanceof DOMException) {
      throw error;
    }
    throw new RosterApiError(
      "Dino could not reach the roster service.",
      0,
      "NETWORK_ERROR",
    );
  }
}

function pagePath(path: string, cursor?: string) {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return `${path}?${params.toString()}`;
}

export const rosterApi = {
  invitations: async (
    actor: WorkoutActor,
    cursor?: string,
    signal?: AbortSignal,
  ) =>
    request<RosterInvitationPage>(
      pagePath("/roster-invitations", cursor),
      await actorToken(actor),
      { signal },
    ),
  athletes: async (
    actor: WorkoutActor,
    cursor?: string,
    signal?: AbortSignal,
  ) =>
    request<RosterAthletePage>(
      pagePath("/roster/athletes", cursor),
      await actorToken(actor),
      { signal },
    ),
  create: async (actor: WorkoutActor, email: string) =>
    request<RosterInvitation>("/roster-invitations", await actorToken(actor), {
      method: "POST",
      body: { email },
    }),
  resend: async (actor: WorkoutActor, id: string) =>
    request<RosterInvitation>(
      `/roster-invitations/${id}/resend`,
      await actorToken(actor),
      { method: "POST" },
    ),
  revoke: async (actor: WorkoutActor, id: string) =>
    request<RosterInvitation>(
      `/roster-invitations/${id}/revoke`,
      await actorToken(actor),
      { method: "POST" },
    ),
  mine: (token: string) =>
    request<MineInvitation>("/roster-invitations/mine", token),
  mineForActor: async (actor: WorkoutActor, signal?: AbortSignal) =>
    request<MineInvitation>(
      "/roster-invitations/mine",
      await actorToken(actor),
      { signal },
    ),
  accept: (
    token: string,
    id: string,
    input: { displayName: string; adultConfirmed: boolean },
  ) =>
    request<{
      account: {
        id: string;
        displayName: string;
        role: "Athlete";
        status: "active";
      };
      coach: { id: string; displayName: string };
      relationshipId: string;
    }>(`/roster-invitations/${id}/accept`, token, {
      method: "POST",
      body: input,
    }),
};
