import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { MealRecommendationsController } from './meal-recommendations.controller';
import { MealRecommendationsService } from './meal-recommendations.service';

@Module({
  imports: [DatabaseModule, IdentityModule, WorkoutsModule],
  controllers: [MealRecommendationsController],
  providers: [MealRecommendationsService],
})
export class MealRecommendationsModule {}
