import { HttpStatus, SetMetadata } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccountRole } from '../database/schema';
import type { AccountRequest } from './auth.types';
import { IdentityException } from './identity-errors';

const ROLE_KEY = 'dinoRole';
export const RequireRole = (role: AccountRole) => SetMetadata(ROLE_KEY, role);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccountRole>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<AccountRequest>();
    if (request.account?.role !== required) {
      throw new IdentityException(
        'ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'This account role cannot access the requested resource.',
      );
    }
    return true;
  }
}
