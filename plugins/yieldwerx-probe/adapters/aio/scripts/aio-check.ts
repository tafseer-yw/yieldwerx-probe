/**
 * AIO Tests connectivity check — `npm run aio:check`.
 *
 * A fast, read-only pre-flight: validates that the current user's
 * `AIO_API_TOKEN` (from their own gitignored `.env`) authenticates against the
 * configured project. Run it before `/sync-cases` — the sync stage runs the
 * same probe automatically before any live push. Exits non-zero on failure so
 * it can gate CI or a script chain. Never writes to AIO.
 */
import { checkConnectivity, loadConfig } from './aio-lib.ts';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const token = process.env.AIO_API_TOKEN;
  const email = process.env.AIO_EMAIL;

  process.stdout.write(
    `AIO connectivity check\n` +
      `  base: ${cfg.apiBaseUrl}\n  project: ${cfg.projectKey}\n  auth: ${cfg.auth}\n`,
  );

  if (!token) {
    process.stdout.write(
      '  ✗ AIO_API_TOKEN is not set. Add your PERSONAL token to your own .env\n' +
        '    (copy .env.example → .env; never commit it). Generate it in AIO:\n' +
        '    gear → My Settings → API Token → Generate.\n',
    );
    process.exitCode = 1;
    return;
  }
  if (cfg.auth === 'basic' && !email) {
    process.stdout.write('  ✗ basic auth needs AIO_EMAIL in your .env.\n');
    process.exitCode = 1;
    return;
  }

  const result = await checkConnectivity(cfg, token, email);
  process.stdout.write(`  ${result.ok ? '✓ connected' : '✗ failed'} — ${result.detail}\n`);
  if (!result.ok) process.exitCode = 1;
}

void main().catch((err: unknown) => {
  process.stderr.write(`aio:check failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
