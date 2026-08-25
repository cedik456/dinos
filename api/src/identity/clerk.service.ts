import { createClerkClient, verifyToken } from '@clerk/backend';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkService {
  private readonly secretKey: string;
  private readonly authorizedParties: string[];
  private readonly client: ReturnType<typeof createClerkClient>;

  constructor(config: ConfigService) {
    this.secretKey = config.getOrThrow<string>('CLERK_SECRET_KEY');
    this.authorizedParties = config
      .getOrThrow<string>('CLERK_AUTHORIZED_PARTIES')
      .split(',')
      .map((party) => party.trim())
      .filter(Boolean);
    this.client = createClerkClient({ secretKey: this.secretKey });
  }

  async verifySessionToken(token: string) {
    return verifyToken(token, {
      secretKey: this.secretKey,
      authorizedParties: this.authorizedParties,
    });
  }

  getUser(subject: string) {
    return this.client.users.getUser(subject);
  }

  async listAccountInvitations(email: string, accountId: string) {
    const response = await this.client.invitations.getInvitationList({
      query: email,
    });
    return response.data.filter(
      (invitation) => invitation.publicMetadata?.dinoAccountId === accountId,
    );
  }

  createInvitation(email: string, accountId: string) {
    return this.client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { dinoAccountId: accountId },
      notify: true,
    });
  }

  revokeInvitation(invitationId: string) {
    return this.client.invitations.revokeInvitation(invitationId);
  }

  async revokeAllSessions(subject: string): Promise<void> {
    const sessions = await this.client.sessions.getSessionList({
      userId: subject,
    });
    await Promise.all(
      sessions.data
        .filter((session) => session.status === 'active')
        .map((session) => this.client.sessions.revokeSession(session.id)),
    );
  }

  async hasActiveSessions(subject: string): Promise<boolean> {
    const sessions = await this.client.sessions.getSessionList({
      userId: subject,
      status: 'active',
    });
    return sessions.data.length > 0;
  }
}
