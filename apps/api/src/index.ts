import { command, positional, run, string, subcommands } from 'cmd-ts';

const startApi = async () => {
  const [{ app }, { runMigrate }, { prod }] = await Promise.all([
    import('./api'),
    import('./lib/db/migrate'),
    import('./lib/utils/env'),
  ]);

  if (prod) {
    // Block startup on migrations so the server never serves an old schema.
    try {
      await runMigrate();
    } catch (err) {
      console.error('❌ Migration failed');
      console.error(err);
      process.exit(1);
    }
  }

  app.listen(parseInt(process.env.SERVER_PORT || '3000', 10));

  const gracefulShutdown = async () => {
    await app.stop();
    process.exit(0);
  };
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

const apiCommand = command({
  name: 'api',
  args: {},
  handler: async () => {
    await startApi();
  },
});

const scriptCommand = command({
  name: 'script',
  args: {
    scriptName: positional({
      type: string,
      displayName: 'script-name',
    }),
  },
  handler: async ({ scriptName }) => {
    switch (scriptName) {
      case 'validate_street_view_locations':
        await import('./scripts/validate_street_view_locations');
        break;
      default:
        console.error(`Unknown script: ${scriptName}`);
        console.error('Available scripts: validate_street_view_locations');
        process.exit(1);
    }
  },
});

const cli = subcommands({
  name: 'api-cli',
  cmds: {
    api: apiCommand,
    script: scriptCommand,
  },
});

if (process.argv.length === 2) {
  await startApi();
} else {
  await run(cli, process.argv.slice(2));
}
