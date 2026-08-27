import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CatalogImportService } from './catalog-import.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const report = await app.get(CatalogImportService).reconcile();
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Exercise catalog import failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
