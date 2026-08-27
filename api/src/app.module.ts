import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { MealRecommendationsModule } from './meal-recommendations/meal-recommendations.module';
import { RosterModule } from './roster/roster.module';
import { TemplatesModule } from './templates/templates.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { WeeklyProgressModule } from './weekly-progress/weekly-progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    HealthModule,
    IdentityModule,
    MealRecommendationsModule,
    RosterModule,
    TemplatesModule,
    WorkoutsModule,
    WeeklyProgressModule,
  ],
})
export class AppModule {}
