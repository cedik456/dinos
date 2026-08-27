import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AccountRequest, ClerkRequest } from '../identity/auth.types';
import { AccountGuard } from '../identity/account.guard';
import { ClerkTokenGuard } from '../identity/clerk-token.guard';
import { RosterService } from './roster.service';
import type { RosterActor } from './roster.types';
import {
  canonicalRosterEmail,
  parseRosterId,
  parseRosterListInput,
} from './roster-validation';

@Controller('roster-invitations')
export class RosterInvitationsController {
  constructor(private readonly roster: RosterService) {}

  @Post()
  @UseGuards(AccountGuard)
  create(@Req() request: AccountRequest, @Body() body: unknown) {
    const value = body && typeof body === 'object' ? body : {};
    return this.roster.create(
      this.actor(request),
      canonicalRosterEmail((value as Record<string, unknown>).email),
    );
  }

  @Get()
  @UseGuards(AccountGuard)
  list(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.roster.listInvitations(
      this.actor(request),
      parseRosterListInput(query),
    );
  }

  @Get('mine')
  @UseGuards(ClerkTokenGuard)
  mine(@Req() request: ClerkRequest) {
    return this.roster.mine(request.clerkSubject!);
  }

  @Post(':id/resend')
  @UseGuards(AccountGuard)
  resend(@Req() request: AccountRequest, @Param('id') id: string) {
    return this.roster.resend(this.actor(request), parseRosterId(id));
  }

  @Post(':id/revoke')
  @UseGuards(AccountGuard)
  revoke(@Req() request: AccountRequest, @Param('id') id: string) {
    return this.roster.revoke(this.actor(request), parseRosterId(id));
  }

  @Post(':id/accept')
  @UseGuards(ClerkTokenGuard)
  accept(
    @Req() request: ClerkRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const value = body && typeof body === 'object' ? body : {};
    const input = value as Record<string, unknown>;
    return this.roster.accept(request.clerkSubject!, parseRosterId(id), {
      displayName:
        typeof input.displayName === 'string' ? input.displayName : undefined,
      adultConfirmed: input.adultConfirmed === true,
    });
  }

  private actor(request: AccountRequest): RosterActor {
    return { id: request.account!.id, role: request.account!.role };
  }
}

@Controller('roster/athletes')
@UseGuards(AccountGuard)
export class RosterAthletesController {
  constructor(private readonly roster: RosterService) {}

  @Get()
  list(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.roster.listAthletes(
      { id: request.account!.id, role: request.account!.role },
      parseRosterListInput(query),
    );
  }
}
