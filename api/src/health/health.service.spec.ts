import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let ping: jest.MockedFunction<DatabaseService['ping']>;

  beforeEach(async () => {
    ping = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DatabaseService,
          useValue: { ping },
        },
      ],
    }).compile();

    healthService = module.get(HealthService);
  });

  it('reports that the API and database are healthy', async () => {
    await expect(healthService.check()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('returns a service unavailable error when PostgreSQL cannot be reached', async () => {
    ping.mockRejectedValue(new Error('database unavailable'));

    await expect(healthService.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
