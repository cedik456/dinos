import type { AccountRole, RosterInvitation } from '../database/schema';

export type RosterActor = {
  id: string;
  role: AccountRole;
};

export type RosterInvitationDto = {
  id: string;
  email: string;
  status: RosterInvitation['status'];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RosterInvitationPageDto = {
  items: RosterInvitationDto[];
  nextCursor: string | null;
};

export type RosterAthleteDto = {
  relationshipId: string;
  athleteAccountId: string;
  displayName: string;
  startedAt: string;
};

export type RosterAthletePageDto = {
  items: RosterAthleteDto[];
  nextCursor: string | null;
};

export type RosterListInput = {
  cursor: string | null;
  limit: number;
};
