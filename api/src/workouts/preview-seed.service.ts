import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { accounts, type AccountRole } from '../database/schema';
import { DatabaseService } from '../database/database.service';
import { IdentityException } from '../identity/identity-errors';
import { PREVIEW_ATHLETE_ID, PREVIEW_COACH_ID } from './workout-actor.guard';

@Injectable()
export class PreviewSeedService {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async reconcile(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') !== 'development') {
      throw new IdentityException(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'Preview accounts can only be seeded in development.',
      );
    }
    const previewAccounts: Array<{
      id: string;
      authSubject: string;
      email: string;
      displayName: string;
      role: AccountRole;
    }> = [
      {
        id: PREVIEW_COACH_ID,
        authSubject: 'preview:coach:ced',
        email: 'preview.coach@dino.local',
        displayName: 'Ced',
        role: 'Coach',
      },
      {
        id: PREVIEW_ATHLETE_ID,
        authSubject: 'preview:athlete:mika',
        email: 'preview.athlete@dino.local',
        displayName: 'Mika',
        role: 'Athlete',
      },
    ];
    for (const account of previewAccounts) {
      await this.database.client
        .insert(accounts)
        .values({
          ...account,
          status: 'active',
          activatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            authSubject: account.authSubject,
            email: account.email,
            displayName: account.displayName,
            role: account.role,
            status: 'active',
            activatedAt: sql`coalesce(${accounts.activatedAt}, now())`,
            disabledAt: null,
            cancelledAt: null,
            updatedAt: new Date(),
          },
        });
    }
  }
}
