import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AccountRequest, ClerkRequest } from './auth.types';
import { AccountGuard } from './account.guard';
import { ClerkTokenGuard } from './clerk-token.guard';
import { IdentityService } from './identity.service';
import { ResendLimiterService } from './resend-limiter.service';

@Controller()
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly limiter: ResendLimiterService,
  ) {}

  @Post('me/activate')
  @UseGuards(ClerkTokenGuard)
  activate(@Req() request: ClerkRequest) {
    return this.identity.activate(request.clerkSubject!);
  }

  @Get('me')
  @UseGuards(AccountGuard)
  me(@Req() request: AccountRequest) {
    return this.identity.toMe(request.account!);
  }

  @Post('auth/activation/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  async resend(
    @Body() body: { email?: string },
    @Req() request: ClerkRequest,
  ): Promise<{ accepted: true }> {
    const email = (body.email ?? '').trim().toLowerCase();
    this.limiter.assertAllowed(email, request.ip ?? 'unknown');
    try {
      await this.identity.resendActivation(email);
    } catch {
      // The public response stays generic for known and unknown accounts.
    }
    return { accepted: true };
  }
}
