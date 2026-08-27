import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { IdentityException } from './identity-errors';

const unavailableDatabaseCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '53300',
  '57P01',
  '57P02',
  '57P03',
]);

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (
    typeof candidate.code === 'string' &&
    unavailableDatabaseCodes.has(candidate.code)
  ) {
    return true;
  }
  return candidate.cause !== error && isDatabaseUnavailable(candidate.cause);
}

@Catch()
export class IdentityErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = request.header('x-request-id') ?? randomUUID();
    const databaseUnavailable = isDatabaseUnavailable(error);
    const status = databaseUnavailable
      ? HttpStatus.SERVICE_UNAVAILABLE
      : error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const serviceUnavailableStatus: number = HttpStatus.SERVICE_UNAVAILABLE;
    const code = databaseUnavailable
      ? 'DATABASE_UNAVAILABLE'
      : error instanceof IdentityException
        ? error.code
        : status === serviceUnavailableStatus
          ? 'DATABASE_UNAVAILABLE'
          : 'IDENTITY_UNAVAILABLE';
    const message =
      error instanceof HttpException
        ? String(error.message)
        : 'The request could not be completed.';

    response.status(status).json({ code, message, requestId });
  }
}
