import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AccountRequest } from '../identity/auth.types';
import { WorkoutActorGuard } from './workout-actor.guard';
import type { WorkoutActor } from './workout.types';
import {
  normalizeOptionalText,
  parseWorkoutInput,
  parseWorkoutListFilters,
} from './workout-validation';
import { WorkoutsService } from './workouts.service';

@Controller('workout-assignments')
@UseGuards(WorkoutActorGuard)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Post()
  create(@Req() request: AccountRequest, @Body() body: unknown) {
    return this.workouts.create(
      this.actor(request),
      parseWorkoutInput(body, true),
    );
  }

  @Get()
  list(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.workouts.list(
      this.actor(request),
      parseWorkoutListFilters(query),
    );
  }

  @Get(':id')
  detail(@Req() request: AccountRequest, @Param('id') id: string) {
    return this.workouts.getDetail(this.actor(request), id);
  }

  @Patch(':id')
  edit(
    @Req() request: AccountRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.workouts.edit(
      this.actor(request),
      id,
      parseWorkoutInput(body, false),
    );
  }

  @Post(':id/complete')
  complete(
    @Req() request: AccountRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const value = body && typeof body === 'object' ? body : {};
    const note = normalizeOptionalText(
      (value as Record<string, unknown>).note,
      'note',
    );
    return this.workouts.complete(this.actor(request), id, note);
  }

  @Post(':id/review')
  review(
    @Req() request: AccountRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const value = body && typeof body === 'object' ? body : {};
    const response = normalizeOptionalText(
      (value as Record<string, unknown>).response,
      'response',
    );
    return this.workouts.review(this.actor(request), id, response);
  }

  private actor(request: AccountRequest): WorkoutActor {
    const account = request.account!;
    return {
      id: account.id,
      displayName: account.displayName,
      role: account.role,
    };
  }
}
