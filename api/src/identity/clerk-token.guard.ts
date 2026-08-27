import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ClerkService } from './clerk.service';
import type { ClerkRequest } from './auth.types';
import { IdentityException } from './identity-errors';

@Injectable()
export class ClerkTokenGuard implements CanActivate {
  constructor(private readonly clerk: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClerkRequest>();
    const header = request.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new IdentityException(
        'AUTH_REQUIRED',
        HttpStatus.UNAUTHORIZED,
        'Authentication is required.',
      );
    }
    try {
      const payload = await this.clerk.verifySessionToken(token);
      request.clerkSubject = payload.sub;
      return true;
    } catch {
      throw new IdentityException(
        'AUTH_REQUIRED',
        HttpStatus.UNAUTHORIZED,
        'Authentication is required.',
      );
    }
  }
}
