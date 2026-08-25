import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { PreviewSeedService } from './preview-seed.service';
import { WorkoutActorGuard } from './workout-actor.guard';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [WorkoutsController],
  providers: [WorkoutActorGuard, WorkoutsService, PreviewSeedService],
  exports: [PreviewSeedService, WorkoutActorGuard],
})
export class WorkoutsModule {}
