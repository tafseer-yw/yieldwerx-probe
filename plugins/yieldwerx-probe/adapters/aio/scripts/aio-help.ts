/** Print the portable AIO command list. This command does not use the network. */
interface Cmd {
  cmd: string;
  desc: string;
}

const COMMANDS: Cmd[] = [
  { cmd: 'probe aio help', desc: 'Show this list.' },
  {
    cmd: 'probe aio check',
    desc: 'Check the token and project connection without changing AIO.',
  },
  {
    cmd: 'probe aio whoami',
    desc: 'Show the project and permissions available to the token.',
  },
  {
    cmd: 'probe aio folders [--ids]',
    desc: 'List test-case folders. Add --ids to include folder IDs.',
  },
  {
    cmd: 'probe aio cases ["<folder>"]',
    desc: 'List cases in one folder, or show a small sample.',
  },
  {
    cmd: 'probe aio sync <feature>',
    desc: 'Preview the changes for one feature. This is the default.',
  },
  {
    cmd: 'probe aio sync <feature> --case <TC> --validate',
    desc: 'Send one case to validate the connection and payload.',
  },
  {
    cmd: 'probe aio sync <feature> --live',
    desc: 'Send cases after a recorded human Design Gate approval.',
  },
];

process.stdout.write('AIO Tests / Case Sync commands\n');
process.stdout.write(
  '(set AIO_API_TOKEN in the process environment or the consumer project .env)\n\n',
);
const width = Math.max(...COMMANDS.map((command) => command.cmd.length));
for (const command of COMMANDS) {
  process.stdout.write(`  ${command.cmd.padEnd(width)}  ${command.desc}\n`);
}
process.stdout.write(
  '\nSetup: PROBE CLI guide. Workflow: yw:sync-cases.\n',
);
