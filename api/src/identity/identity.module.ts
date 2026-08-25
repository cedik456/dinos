import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { AccountGuard } from './account.guard';
import { ClerkService } from './clerk.service';
import { ClerkTokenGuard } from './clerk-token.guard';
import { IdentityController } from './identity.controller';
import { IdentityErrorFilter } from './identity-error.filter';
import { IdentityService } from './identity.service';
import { OperatorService } from './operator.service';
import { ResendLimiterService } from './resend-limiter.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [IdentityController],
  providers: [
    ClerkService,
    ClerkTokenGuard,
    AccountGuard,
    RolesGuard,
    IdentityService,
    OperatorService,
    ResendLimiterService,
    { provide: APP_FILTER, useClass: IdentityErrorFilter },
  ],
  exports: [
    AccountGuard,
    ClerkService,
    ClerkTokenGuard,
    RolesGuard,
    IdentityService,
    OperatorService,
  ],
})
export class IdentityModule {}
