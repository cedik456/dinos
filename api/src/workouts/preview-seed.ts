import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PreviewSeedService } from './preview-seed.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    await app.get(PreviewSeedService).reconcile();
    process.stdout.write('Preview accounts are ready.\n');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const cause =
    error && typeof error === 'object' && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : null;
  const message =
    cause instanceof Error
      ? cause.message
      : error instanceof Error
        ? error.message
        : 'Preview seed failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
