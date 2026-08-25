import { ResendLimiterService } from './resend-limiter.service';

describe('ResendLimiterService', () => {
  it('limits a canonical email to one request per minute', () => {
    const limiter = new ResendLimiterService();
    limiter.assertAllowed('athlete@example.com', '127.0.0.1');
    expect(() =>
      limiter.assertAllowed('athlete@example.com', '127.0.0.2'),
    ).toThrow('Please wait before trying again.');
  });

  it('does not expose the email in its stored keys', () => {
    const limiter = new ResendLimiterService();
    limiter.assertAllowed('private@example.com', '127.0.0.1');
    expect(JSON.stringify(limiter)).not.toContain('private@example.com');
  });
});
