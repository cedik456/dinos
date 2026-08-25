import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import type { RosterListInput } from './roster.types';

function invalid(message: string): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    message,
  );
}

export function canonicalRosterEmail(value: unknown): string {
  if (typeof value !== 'string') return invalid('email is required.');
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return invalid('email must be a valid address.');
  }
  return email;
}

export function rosterDisplayName(value: unknown): string {
  if (typeof value !== 'string') return invalid('displayName is required.');
  const name = value.trim();
  if (!name || [...name].length > 100) {
    return invalid('displayName must contain 1 through 100 characters.');
  }
  return name;
}

export function parseRosterListInput(
  query: Record<string, unknown>,
): RosterListInput {
  const cursor = query.cursor;
  if (cursor !== undefined && typeof cursor !== 'string') {
    return invalid('cursor must be provided once.');
  }
  const limitValue = query.limit;
  if (limitValue !== undefined && typeof limitValue !== 'string') {
    return invalid('limit must be provided once.');
  }
  const limit = limitValue === undefined ? 20 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return invalid('limit must be an integer from 1 through 50.');
  }
  return { cursor: cursor ?? null, limit };
}

export function parseRosterId(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return invalid('id must be a UUID.');
  }
  return value;
}

type InvitationCursor = { coachId: string; createdAt: string; id: string };
type AthleteCursor = { coachId: string; displayName: string; id: string };

function decode<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return invalid('cursor is invalid.');
  }
}

export function invitationCursor(value: string, coachId: string) {
  const cursor = decode<InvitationCursor>(value);
  if (
    cursor.coachId !== coachId ||
    typeof cursor.createdAt !== 'string' ||
    typeof cursor.id !== 'string'
  ) {
    return invalid('cursor is invalid.');
  }
  return cursor;
}

export function athleteCursor(value: string, coachId: string) {
  const cursor = decode<AthleteCursor>(value);
  if (
    cursor.coachId !== coachId ||
    typeof cursor.displayName !== 'string' ||
    typeof cursor.id !== 'string'
  ) {
    return invalid('cursor is invalid.');
  }
  return cursor;
}

export function encodeInvitationCursor(value: InvitationCursor) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function encodeAthleteCursor(value: AthleteCursor) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
