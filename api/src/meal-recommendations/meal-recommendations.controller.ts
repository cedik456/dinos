import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AccountRequest } from '../identity/auth.types';
import { WorkoutActorGuard } from '../workouts/workout-actor.guard';
import { MealRecommendationsService } from './meal-recommendations.service';
import type { MealRecommendationsActor } from './meal-recommendations.types';
import {
  parseMealAthleteAccountId,
  parseMealRecommendationsDelete,
  parseMealRecommendationsQuery,
  parseMealRecommendationsSave,
} from './meal-recommendations-validation';

@Controller('meal-recommendations')
@UseGuards(WorkoutActorGuard)
export class MealRecommendationsController {
  constructor(private readonly meals: MealRecommendationsService) {}

  @Get()
  getForAthlete(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.meals.getForAthlete(
      this.actor(request),
      parseMealRecommendationsQuery(query),
    );
  }

  @Get('athletes/:athleteAccountId')
  getForCoach(
    @Req() request: AccountRequest,
    @Param('athleteAccountId') athleteAccountId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.meals.getForCoach(
      this.actor(request),
      parseMealAthleteAccountId(athleteAccountId),
      parseMealRecommendationsQuery(query),
    );
  }

  @Put('athletes/:athleteAccountId')
  saveForCoach(
    @Req() request: AccountRequest,
    @Param('athleteAccountId') athleteAccountId: string,
    @Body() body: unknown,
  ) {
    return this.meals.saveForCoach(
      this.actor(request),
      parseMealAthleteAccountId(athleteAccountId),
      parseMealRecommendationsSave(body),
    );
  }

  @Delete('athletes/:athleteAccountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForCoach(
    @Req() request: AccountRequest,
    @Param('athleteAccountId') athleteAccountId: string,
    @Body() body: unknown,
  ): Promise<void> {
    await this.meals.deleteForCoach(
      this.actor(request),
      parseMealAthleteAccountId(athleteAccountId),
      parseMealRecommendationsDelete(body),
    );
  }

  private actor(request: AccountRequest): MealRecommendationsActor {
    const account = request.account!;
    return {
      id: account.id,
      displayName: account.displayName,
      role: account.role,
    };
  }
}
