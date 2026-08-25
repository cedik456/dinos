import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IdentityService } from './identity.service';
import { OperatorService } from './operator.service';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const action = process.argv[2];
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const operator = app.get(OperatorService);
    let result;
    if (action === 'provision') {
      const email = option('email');
      const displayName = option('display-name');
      const role = option('role');
      if (!email || !displayName || !role) {
        throw new Error(
          'Provision requires --email, --display-name, and --role.',
        );
      }
      result = await operator.provision({
        email,
        displayName,
        role: IdentityService.parseRole(role),
      });
    } else {
      const accountId = await operator.resolveAccountId(
        option('account-id'),
        option('email'),
      );
      if (action === 'inspect') result = await operator.inspect(accountId);
      else if (action === 'disable') result = await operator.disable(accountId);
      else if (action === 'reactivate')
        result = await operator.reactivate(accountId);
      else if (action === 'cancel') result = await operator.cancel(accountId);
      else
        throw new Error(
          'Action must be provision, inspect, disable, reactivate, or cancel.',
        );
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.outcome === 'reconciliation_required' ? 3 : 0;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n`,
    );
    process.exitCode = 2;
  } finally {
    await app.close();
  }
}

void main();
