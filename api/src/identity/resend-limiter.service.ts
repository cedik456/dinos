import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IdentityException } from './identity-errors';

@Injectable()
export class ResendLimiterService {
  private readonly hits = new Map<string, number[]>();

  assertAllowed(email: string, clientAddress: string): void {
    const now = Date.now();
    const emailKey = `email:${createHash('sha256').update(email).digest('hex')}`;
    const clientKey = `client:${clientAddress}`;
    this.check(emailKey, now, 60_000, 1);
    this.check(emailKey, now, 3_600_000, 5);
    this.check(clientKey, now, 3_600_000, 20);
    this.record(emailKey, now);
    this.record(clientKey, now);
  }

  private check(
    key: string,
    now: number,
    windowMs: number,
    limit: number,
  ): void {
    const recent = (this.hits.get(key) ?? []).filter(
      (hit) => now - hit < windowMs,
    );
    this.hits.set(key, recent);
    if (recent.length >= limit) {
      throw new IdentityException(
        'RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
        'Please wait before trying again.',
      );
    }
  }

  private record(key: string, now: number): void {
    this.hits.set(key, [...(this.hits.get(key) ?? []), now]);
  }
}
