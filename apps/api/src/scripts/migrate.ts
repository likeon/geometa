import { runMigrate } from '@api/lib/db/migrate';

function printError(error: unknown, label = 'Migration error'): void {
  console.error(`\n${label}:`);

  if (!(error instanceof Error)) {
    console.error(error);
    return;
  }

  console.error(error.stack ?? error.message);

  const details = Object.fromEntries(
    Object.entries(error).filter(([key]) => key !== 'cause'),
  );
  if (Object.keys(details).length > 0) {
    console.error('Details:', details);
  }

  if (error.cause !== undefined) {
    printError(error.cause, 'Caused by');
  }
}

try {
  await runMigrate('./src/lib/db/migrations');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed');
  printError(error);
  process.exit(1);
}
