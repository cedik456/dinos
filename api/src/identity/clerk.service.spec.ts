import { createClerkClient, verifyToken } from '@clerk/backend';
import { decodeJwt } from '@clerk/backend/jwt';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(),
  verifyToken: jest.fn(),
}));
jest.mock('@clerk/backend/jwt', () => ({ decodeJwt: jest.fn() }));

describe('ClerkService', () => {
  const config = {
    getOrThrow: jest.fn((name: string) => {
      if (name === 'CLERK_SECRET_KEY') return 'sk_test_example';
      if (name === 'CLERK_AUTHORIZED_PARTIES') return 'dino://';
      throw new Error(`Unexpected config value: ${name}`);
    }),
  } as unknown as ConfigService;

  it('verifies native bearer tokens without requiring a browser origin', async () => {
    jest
      .mocked(decodeJwt)
      .mockReturnValue({ payload: {} } as ReturnType<typeof decodeJwt>);
    jest
      .mocked(verifyToken)
      .mockResolvedValue({ sub: 'user_1' } as Awaited<
        ReturnType<typeof verifyToken>
      >);
    const service = new ClerkService(config);

    await service.verifySessionToken('native-token');

    expect(verifyToken).toHaveBeenCalledWith('native-token', {
      secretKey: 'sk_test_example',
    });
  });

  it('keeps the origin allowlist for tokens that include azp', async () => {
    jest.mocked(decodeJwt).mockReturnValue({
      payload: { azp: 'dino://' },
    } as ReturnType<typeof decodeJwt>);
    jest
      .mocked(verifyToken)
      .mockResolvedValue({ sub: 'user_1' } as Awaited<
        ReturnType<typeof verifyToken>
      >);
    const service = new ClerkService(config);

    await service.verifySessionToken('browser-token');

    expect(verifyToken).toHaveBeenCalledWith('browser-token', {
      secretKey: 'sk_test_example',
      authorizedParties: ['dino://'],
    });
  });

  it('uses the hosted Account Portal for application invitations', async () => {
    const createInvitation = jest.fn().mockResolvedValue({ id: 'inv_1' });
    jest.mocked(createClerkClient).mockReturnValue({
      invitations: { createInvitation },
    } as unknown as ReturnType<typeof createClerkClient>);
    const service = new ClerkService(config);
    await service.createInvitation('athlete@example.com', 'account_1');

    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: 'athlete@example.com',
      publicMetadata: { dinoAccountId: 'account_1' },
      notify: true,
    });
  });

  it('binds roster invitations to the Dino invitation id', async () => {
    const createInvitation = jest.fn().mockResolvedValue({ id: 'inv_2' });
    jest.mocked(createClerkClient).mockReturnValue({
      invitations: { createInvitation },
    } as unknown as ReturnType<typeof createClerkClient>);

    const service = new ClerkService(config);
    await service.createRosterInvitation(
      'athlete@example.com',
      'roster_invitation_1',
    );

    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: 'athlete@example.com',
      expiresInDays: 7,
      ignoreExisting: true,
      notify: true,
      publicMetadata: { dinoRosterInvitationId: 'roster_invitation_1' },
    });
  });

  it('keeps only the exact roster invitation during retry lookup', async () => {
    const getInvitationList = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'right',
          emailAddress: 'athlete@example.com',
          publicMetadata: { dinoRosterInvitationId: 'roster_1' },
        },
        {
          id: 'wrong',
          emailAddress: 'athlete@example.com',
          publicMetadata: { dinoRosterInvitationId: 'roster_2' },
        },
      ],
    });
    jest.mocked(createClerkClient).mockReturnValue({
      invitations: { getInvitationList },
    } as unknown as ReturnType<typeof createClerkClient>);

    const service = new ClerkService(config);
    const invitations = await service.listRosterInvitations(
      'athlete@example.com',
      'roster_1',
    );

    expect(invitations.map((item) => item.id)).toEqual(['right']);
  });
});
