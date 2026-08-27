import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import {
  RosterAthletesController,
  RosterInvitationsController,
} from './roster.controller';
import { RosterLimiterService } from './roster-limiter.service';
import { RosterService } from './roster.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [RosterInvitationsController, RosterAthletesController],
  providers: [RosterService, RosterLimiterService],
  exports: [RosterService],
})
export class RosterModule {}
