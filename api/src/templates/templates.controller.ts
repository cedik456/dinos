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
import type { AccountRequest } from '../identity/auth.types';
import { RequireRole, RolesGuard } from '../identity/roles.guard';
import { WorkoutActorGuard } from '../workouts/workout-actor.guard';
import type { TemplateActor } from './template.types';
import {
  parseTemplateCreate,
  parseTemplateId,
  parseTemplateList,
} from './template-validation';
import { TemplatesService } from './templates.service';

@Controller()
@UseGuards(WorkoutActorGuard, RolesGuard)
@RequireRole('Coach')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get('reference-exercises')
  listExercises(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.templates.listExercises(
      this.actor(request),
      parseTemplateList(query, true),
    );
  }

  @Get('workout-templates')
  listTemplates(
    @Req() request: AccountRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.templates.listTemplates(
      this.actor(request),
      parseTemplateList(query, false),
    );
  }

  @Get('workout-templates/:id')
  getTemplate(@Req() request: AccountRequest, @Param('id') id: string) {
    return this.templates.get(this.actor(request), parseTemplateId(id));
  }

  @Post('workout-templates')
  create(@Req() request: AccountRequest, @Body() body: unknown) {
    return this.templates.create(
      this.actor(request),
      parseTemplateCreate(body),
    );
  }

  private actor(request: AccountRequest): TemplateActor {
    const account = request.account!;
    return {
      id: account.id,
      displayName: account.displayName,
      role: account.role,
    };
  }
}
