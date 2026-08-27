import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { TemplatesController } from './templates.controller';
import { CatalogImportService } from './catalog-import.service';
import { TemplatesService } from './templates.service';

@Module({
  imports: [DatabaseModule, IdentityModule, WorkoutsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, CatalogImportService],
})
export class TemplatesModule {}
