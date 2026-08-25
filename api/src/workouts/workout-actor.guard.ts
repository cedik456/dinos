import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { accounts } from '../database/schema';
import { DatabaseService } from '../database/database.service';
import type { AccountRequest } from '../identity/auth.types';
import { AccountGuard } from '../identity/account.guard';
import { IdentityException } from '../identity/identity-errors';

export const PREVIEW_COACH_ID = '10000000-0000-4000-8000-000000000001';
export const PREVIEW_ATHLETE_ID = '10000000-0000-4000-8000-000000000002';

@Injectable()
export class WorkoutActorGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly accountGuard: AccountGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    const previewRole = request.header('x-dino-preview-role');
    if (!previewRole) return this.accountGuard.canActivate(context);

    const enabled = this.config.get<boolean>(
      'DINO_PREVIEW_ACCESS_ENABLED',
      false,
    );
    if (
      this.config.get<string>('NODE_ENV') !== 'development' ||
      !enabled ||
      !['coach', 'athlete'].includes(previewRole)
    ) {
      throw new IdentityException(
        'AUTH_REQUIRED',
        HttpStatus.UNAUTHORIZED,
        'Valid authentication is required.',
      );
    }

    const id = previewRole === 'coach' ? PREVIEW_COACH_ID : PREVIEW_ATHLETE_ID;
    const [account] = await this.database.client
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    if (!account || account.status !== 'active') {
      throw new IdentityException(
        'ACCOUNT_UNLINKED',
        HttpStatus.FORBIDDEN,
        'The preview account is not available.',
      );
    }
    request.account = account;
    return true;
  }
}
