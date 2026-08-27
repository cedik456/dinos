import { fetch, type FetchRequestInit } from "expo/fetch";

export type DinoAccount = {
  id: string;
  displayName: string;
  role: "Coach" | "Athlete";
  status: "active";
};

type ErrorEnvelope = { code?: string; message?: string; requestId?: string };

export class DinoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "DinoApiError";
  }
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!baseUrl) throw new Error("EXPO_PUBLIC_API_URL is required.");

async function request<T>(
  path: string,
  options: FetchRequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorEnvelope;
      throw new DinoApiError(
        body.message ?? "Dino could not complete the request.",
        response.status,
        body.code ?? "IDENTITY_UNAVAILABLE",
        body.requestId,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DinoApiError) throw error;
    throw new DinoApiError(
      "Dino could not reach the server.",
      0,
      "NETWORK_ERROR",
    );
  }
}

export const identityApi = {
  me: (token: string) => request<DinoAccount>("/me", { token }),
  activate: (token: string) =>
    request<DinoAccount>("/me/activate", { method: "POST", token }),
};
