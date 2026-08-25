import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Account } from '../database/schema';
import { RolesGuard } from './roles.guard';

const account = (role: Account['role']) => ({ role }) as Account;

describe('RolesGuard', () => {
  it('allows only the server loaded account role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('Coach'),
    } as unknown as Reflector;
    const request = { account: account('Coach') };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
    request.account = account('Athlete');
    expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(
      'This account role cannot access the requested resource.',
    );
  });
});
