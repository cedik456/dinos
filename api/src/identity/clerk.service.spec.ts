import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('ClerkService', () => {
  it('uses the hosted Account Portal for application invitations', async () => {
    const createInvitation = jest.fn().mockResolvedValue({ id: 'inv_1' });
    jest.mocked(createClerkClient).mockReturnValue({
      invitations: { createInvitation },
    } as unknown as ReturnType<typeof createClerkClient>);
    const config = {
      getOrThrow: jest.fn((name: string) => {
        if (name === 'CLERK_SECRET_KEY') return 'sk_test_example';
        if (name === 'CLERK_AUTHORIZED_PARTIES') return 'dino://';
        throw new Error(`Unexpected config value: ${name}`);
      }),
    } as unknown as ConfigService;

    const service = new ClerkService(config);
    await service.createInvitation('athlete@example.com', 'account_1');

    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: 'athlete@example.com',
      publicMetadata: { dinoAccountId: 'account_1' },
      notify: true,
    });
  });
});
