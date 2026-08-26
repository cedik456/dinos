import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { WeeklyProgressController } from './weekly-progress.controller';
import { WeeklyProgressService } from './weekly-progress.service';

@Module({
  imports: [DatabaseModule, IdentityModule, WorkoutsModule],
  controllers: [WeeklyProgressController],
  providers: [WeeklyProgressService],
})
export class WeeklyProgressModule {}
