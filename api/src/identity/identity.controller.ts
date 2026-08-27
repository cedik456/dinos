import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { AccountRequest, ClerkRequest } from './auth.types';
import { AccountGuard } from './account.guard';
import { ClerkTokenGuard } from './clerk-token.guard';
import { IdentityService } from './identity.service';

@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

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
}
