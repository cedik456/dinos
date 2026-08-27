import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { accounts } from '../database/schema';
import { DatabaseService } from '../database/database.service';
import type { AccountRequest } from './auth.types';
import { ClerkTokenGuard } from './clerk-token.guard';
import { IdentityException } from './identity-errors';

@Injectable()
export class AccountGuard implements CanActivate {
  constructor(
    private readonly tokenGuard: ClerkTokenGuard,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.tokenGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<AccountRequest>();
    const [account] = await this.database.client
      .select()
      .from(accounts)
      .where(eq(accounts.authSubject, request.clerkSubject!))
      .limit(1);
    if (!account) {
      throw new IdentityException(
        'ACCOUNT_UNLINKED',
        HttpStatus.FORBIDDEN,
        'This identity is not linked to a Dino account.',
      );
    }
    if (account.status !== 'active') {
      throw new IdentityException(
        'ACCOUNT_DISABLED',
        HttpStatus.FORBIDDEN,
        'This Dino account is not active.',
      );
    }
    request.account = account;
    return true;
  }
}
