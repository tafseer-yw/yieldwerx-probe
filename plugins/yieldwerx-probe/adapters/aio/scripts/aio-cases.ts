/**
 * AIO Tests case explorer — `npm run aio:cases`.
 *
 * Read-only. Lists existing test cases, optionally within a folder, so you can
 * see what is already in AIO before Case Sync (and avoid duplicates). AIO's
 * list is paginated ({items, startAt, maxResults, isLast}) and does NOT filter
 * by folder server-side, so this pages through and filters by folder ID
 * client-side, resolving a folder name via the folder tree. Never writes.
 *
 * Run:  npm run aio:cases -- "QA"        (cases in a folder named QA — by name)
 *       npm run aio:cases -- 419          (cases in folder ID 419)
 *       npm run aio:cases                 (a sample page across all folders)
 */
import { authHeader, loadConfig, type SyncConfig } from './aio-lib.ts';

interface Folder {
  ID: number;
  name: string;
  parentID: number | null;
  children: Folder[];
}
interface Case {
  key: string;
  title: string;
  folder: number | null;
  automationKey: string | null;
  status: { name: string } | null;
}
interface CasePage {
  items: Case[];
  startAt: number;
  maxResults: number;
  isLast: boolean;
}

const MAX_PAGES = 60; // safety cap (~6000 cases at 100/page)

/** Flatten the folder tree to {id, name, path}. */
function flatten(folders: Folder[], prefix = ''): { id: number; name: string; path: string }[] {
  return folders.flatMap((f) => {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    return [{ id: f.ID, name: f.name, path }, ...flatten(f.children, path)];
  });
}

async function getJson<T>(cfg: SyncConfig, token: string, email: string | undefined, suffix: string): Promise<T> {
  const res = await fetch(`${cfg.apiBaseUrl}${suffix}`, {
    headers: { Authorization: authHeader(cfg, token, email), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${suffix} → ${res.status}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const cfg = loadConfig();
  const token = process.env.AIO_API_TOKEN;
  const email = process.env.AIO_EMAIL;
  if (!token) {
    process.stdout.write('✗ AIO_API_TOKEN not set — see npm run aio:check.\n');
    process.exitCode = 1;
    return;
  }

  // Resolve the folder filter (numeric ID, or a name looked up in the tree).
  let folderId: number | undefined;
  let folderLabel = 'all folders';
  if (arg) {
    if (/^\d+$/.test(arg)) {
      folderId = Number(arg);
      folderLabel = `folder #${folderId}`;
    } else {
      const tree = await getJson<Folder[]>(cfg, token, email, `/project/${cfg.projectKey}/testcase/folder`);
      const matches = flatten(tree).filter((f) => f.name.toLowerCase() === arg.toLowerCase());
      if (matches.length === 0) {
        process.stdout.write(`No folder named "${arg}". Run npm run aio:folders --ids to see options.\n`);
        process.exitCode = 1;
        return;
      }
      if (matches.length > 1) {
        process.stdout.write(`"${arg}" is ambiguous — pass the ID:\n`);
        for (const m of matches) process.stdout.write(`  #${m.id}  ${m.path}\n`);
        process.exitCode = 1;
        return;
      }
      folderId = matches[0]?.id;
      folderLabel = `folder "${matches[0]?.path}" (#${folderId})`;
    }
  }

  const found: Case[] = [];
  let startAt = 0;
  let pages = 0;
  let scanned = 0;
  for (;;) {
    const page = await getJson<CasePage>(
      cfg,
      token,
      email,
      `/project/${cfg.projectKey}/testcase?startAt=${startAt}&maxResults=100`,
    );
    scanned += page.items.length;
    for (const c of page.items) {
      if (folderId === undefined || c.folder === folderId) found.push(c);
    }
    pages++;
    // Without a folder filter we only show the first page as a sample.
    if (page.isLast || (folderId === undefined) || pages >= MAX_PAGES) break;
    startAt += page.maxResults;
  }

  process.stdout.write(`AIO cases — project ${cfg.projectKey} · ${folderLabel}\n`);
  if (found.length === 0) {
    process.stdout.write('  (none)\n');
  } else {
    for (const c of found) {
      const auto = c.automationKey ? ` · auto:${c.automationKey}` : '';
      process.stdout.write(`  ${c.key}  [${c.status?.name ?? '—'}]  ${c.title}${auto}\n`);
    }
  }
  const note = folderId === undefined ? ` (sample of first page; ${scanned} scanned)` : ` (${scanned} scanned)`;
  process.stdout.write(`\n  ${found.length} case(s)${note}.\n`);
}

void main().catch((err: unknown) => {
  process.stderr.write(`aio:cases failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
