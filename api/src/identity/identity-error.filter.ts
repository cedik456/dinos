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

@Catch()
export class IdentityErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = request.header('x-request-id') ?? randomUUID();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const serviceUnavailableStatus: number = HttpStatus.SERVICE_UNAVAILABLE;
    const code =
      error instanceof IdentityException
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
