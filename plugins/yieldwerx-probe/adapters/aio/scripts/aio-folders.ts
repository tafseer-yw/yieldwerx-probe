/**
 * AIO Tests folder explorer — `npm run aio:folders`.
 *
 * A read-only helper: prints the existing **test-case folder hierarchy** for
 * the configured project so you can see where Case Sync will place cases (and
 * pick/confirm the folder path in config/aio-sync.json). Never writes.
 *
 * Endpoint: GET {base}/project/{projectKey}/testcase/folder → a nested tree of
 * { ID, name, parentID, children[] }. AIO addresses folders by numeric ID, so
 * this also surfaces the IDs that the sync stage resolves a folder path to.
 *
 * Run:  npm run aio:folders            (full tree)
 *       npm run aio:folders -- --ids   (show folder IDs)
 */
import { authHeader, loadConfig } from './aio-lib.ts';

interface Folder {
  ID: number;
  name: string;
  description: string | null;
  parentID: number | null;
  children: Folder[];
}

function printTree(folders: Folder[], showIds: boolean, depth = 0): number {
  let count = 0;
  for (const f of folders) {
    count++;
    const indent = depth === 0 ? '' : `${'  '.repeat(depth - 1)}├─ `;
    process.stdout.write(`  ${indent}${f.name}${showIds ? `  (#${f.ID})` : ''}\n`);
    if (f.children.length > 0) count += printTree(f.children, showIds, depth + 1);
  }
  return count;
}

async function main(): Promise<void> {
  const showIds = process.argv.includes('--ids');
  const cfg = loadConfig();
  const token = process.env.AIO_API_TOKEN;
  const email = process.env.AIO_EMAIL;
  if (!token) {
    process.stdout.write('✗ AIO_API_TOKEN not set — add it to your .env (see npm run aio:check).\n');
    process.exitCode = 1;
    return;
  }

  const url = `${cfg.apiBaseUrl}/project/${cfg.projectKey}/testcase/folder`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(cfg, token, email), Accept: 'application/json' },
  });
  if (!res.ok) {
    process.stdout.write(
      `✗ Could not read folders (${res.status}). Run \`npm run aio:check\` to diagnose auth/project.\n`,
    );
    process.exitCode = 1;
    return;
  }
  const folders = (await res.json()) as Folder[];
  process.stdout.write(`AIO test-case folders — project ${cfg.projectKey}\n`);
  if (folders.length === 0) {
    process.stdout.write('  (no folders yet)\n');
    return;
  }
  const total = printTree(folders, showIds);
  process.stdout.write(`\n  ${total} folder(s). Tip: set the sync target in config/aio-sync.json "folderTemplate".\n`);
}

void main().catch((err: unknown) => {
  process.stderr.write(`aio:folders failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
