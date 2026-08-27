import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { AccountRequest } from '../identity/auth.types';
import { WorkoutActorGuard } from '../workouts/workout-actor.guard';
import type { WeeklyProgressActor } from './weekly-progress.types';
import {
  parseAthleteAccountId,
  parseWeeklyProgressInput,
} from './weekly-progress-validation';
import { WeeklyProgressService } from './weekly-progress.service';

@Controller('weekly-progress')
@UseGuards(WorkoutActorGuard)
export class WeeklyProgressController {
  constructor(private readonly weeklyProgress: WeeklyProgressService) {}

  @Get()
  getForActor(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.weeklyProgress.getForActor(
      this.actor(request),
      parseWeeklyProgressInput(query),
    );
  }

  @Get('athletes/:athleteAccountId')
  getAthleteForCoach(
    @Req() request: AccountRequest,
    @Param('athleteAccountId') athleteAccountId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.weeklyProgress.getAthleteForCoach(
      this.actor(request),
      parseAthleteAccountId(athleteAccountId),
      parseWeeklyProgressInput(query),
    );
  }

  private actor(request: AccountRequest): WeeklyProgressActor {
    const account = request.account!;
    return {
      id: account.id,
      displayName: account.displayName,
      role: account.role,
    };
  }
}
