import { command, positional, run, string, subcommands } from 'cmd-ts';

const apiCommand = command({
  name: 'api',
  args: {},
  handler: async () => {
    await import('./api');
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
  await import('./api.js');
} else {
  await run(cli, process.argv.slice(2));
}
