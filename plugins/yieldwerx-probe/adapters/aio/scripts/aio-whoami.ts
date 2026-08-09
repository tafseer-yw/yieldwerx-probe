/**
 * AIO Tests access summary — `npm run aio:whoami`.
 *
 * Read-only. Shows the context the current token operates in: base, project
 * key, the project's numeric Jira id, and the token's permission level on the
 * project. NOTE: AIO's REST API does not expose the account identity behind a
 * token (no user/self endpoint), so this reports ACCESS, not a name/email —
 * use `npm run aio:check` for a pass/fail gate. Never writes.
 */
import { authHeader, loadConfig } from './aio-lib.ts';

interface CasePage {
  items: { jiraProjectID?: number; permission?: { value?: number } }[];
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const token = process.env.AIO_API_TOKEN;
  const email = process.env.AIO_EMAIL;
  process.stdout.write(`AIO access summary\n  base: ${cfg.apiBaseUrl}\n  project: ${cfg.projectKey}\n  auth: ${cfg.auth}\n`);
  if (!token) {
    process.stdout.write('  ✗ AIO_API_TOKEN not set — add it to your .env (see npm run aio:check).\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('  token: loaded from environment\n');

  const res = await fetch(`${cfg.apiBaseUrl}/project/${cfg.projectKey}/testcase?maxResults=1`, {
    headers: { Authorization: authHeader(cfg, token, email), Accept: 'application/json' },
  });
  if (!res.ok) {
    process.stdout.write(`  ✗ project not reachable (${res.status}) — run npm run aio:check to diagnose.\n`);
    process.exitCode = 1;
    return;
  }
  const first = ((await res.json()) as CasePage).items[0];
  const perm = first?.permission?.value;
  process.stdout.write(`  ✓ project reachable\n`);
  if (first?.jiraProjectID !== undefined) process.stdout.write(`  jira project id: ${first.jiraProjectID}\n`);
  if (perm !== undefined) {
    process.stdout.write(`  permission level: ${perm}${perm === 15 ? ' (full: view/create/edit/delete)' : ''}\n`);
  }
  process.stdout.write('  (AIO does not expose the account identity behind a token.)\n');
}

void main().catch((err: unknown) => {
  process.stderr.write(`aio:whoami failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
