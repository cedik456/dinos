import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type HealthStatus = {
  status: 'ok';
  database: 'connected';
};

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.database.ping();

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
