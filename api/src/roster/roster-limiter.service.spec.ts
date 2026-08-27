import { RosterLimiterService } from './roster-limiter.service';

describe('RosterLimiterService', () => {
  it('limits resend to once per minute and five times per hour', () => {
    const limiter = new RosterLimiterService();
    limiter.assertResendAllowed('invitation_1', 0);
    expect(() => limiter.assertResendAllowed('invitation_1', 30_000)).toThrow(
      'Please wait before trying again.',
    );

    for (const minute of [2, 4, 6, 8]) {
      limiter.assertResendAllowed('invitation_2', minute * 60_000);
    }
    limiter.assertResendAllowed('invitation_2', 10 * 60_000);
    expect(() =>
      limiter.assertResendAllowed('invitation_2', 12 * 60_000),
    ).toThrow('Please wait before trying again.');
  });

  it('limits creation to twenty attempts in a rolling day', () => {
    const limiter = new RosterLimiterService();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      limiter.assertCreateAllowed('coach_1', attempt * 1_000);
    }
    expect(() => limiter.assertCreateAllowed('coach_1', 20_000)).toThrow(
      'Please wait before trying again.',
    );
  });
});
