import { HttpStatus, Injectable } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';

const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;
const minute = 60 * 1000;

@Injectable()
export class RosterLimiterService {
  private readonly createAttempts = new Map<string, number[]>();
  private readonly resendAttempts = new Map<string, number[]>();

  assertCreateAllowed(coachId: string, now = Date.now()): void {
    const attempts = this.recent(this.createAttempts, coachId, now - day);
    if (attempts.length >= 20) this.limited();
    attempts.push(now);
    this.createAttempts.set(coachId, attempts);
  }

  assertResendAllowed(invitationId: string, now = Date.now()): void {
    const attempts = this.recent(this.resendAttempts, invitationId, now - hour);
    if (
      attempts.length >= 5 ||
      attempts.some((attempt) => attempt > now - minute)
    ) {
      this.limited();
    }
    attempts.push(now);
    this.resendAttempts.set(invitationId, attempts);
  }

  private recent(
    store: Map<string, number[]>,
    key: string,
    cutoff: number,
  ): number[] {
    return (store.get(key) ?? []).filter((value) => value > cutoff);
  }

  private limited(): never {
    throw new IdentityException(
      'RATE_LIMITED',
      HttpStatus.TOO_MANY_REQUESTS,
      'Please wait before trying again.',
    );
  }
}
