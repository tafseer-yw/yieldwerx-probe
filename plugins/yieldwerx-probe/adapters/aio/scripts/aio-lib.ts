/**
 * Shared AIO Tests helpers — config loading, auth header, and a read-only
 * connectivity probe. Used by both `scripts/aio-check.ts` (`npm run aio:check`)
 * and `scripts/aio-sync.ts` (`npm run sync:cases`, which pre-flights the same
 * check before any live push). No CLI entry; no writes.
 *
 * Secrets are NEVER read here from config — the token is passed in by the
 * caller, which sources it from the environment (each user's own `.env`).
 */
import fs from 'node:fs';
import path from 'node:path';
const REPO_ROOT = process.cwd();

export interface SyncConfig {
  apiBaseUrl: string;
  projectKey: string;
  auth: 'aioauth' | 'basic';
  scriptType: string;
  folderTemplate: string;
  defaults: {
    status: string;
    type: string;
    owner: string;
    tags: string[];
    labels: string[];
  };
  requirement: {
    prdPathTemplate: string;
    [key: string]: unknown;
  };
  requirementMap: Record<string, string>;
  [key: string]: unknown;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, name: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value;
}

function stringArray(value: unknown, name: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${name} must be an array of strings.`);
  }
  return value;
}

/** Load and validate config/aio-sync.json (env overrides base URL/projectKey). */
export function loadConfig(): SyncConfig {
  const file = path.join(REPO_ROOT, 'config', 'aio-sync.json');
  if (!fs.existsSync(file)) throw new Error('config/aio-sync.json not found.');
  const source = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  const raw = record(JSON.parse(source), 'AIO config');
  const defaults = record(raw.defaults ?? {}, 'defaults');
  const requirement = record(raw.requirement ?? {}, 'requirement');
  const requirementMapRaw = record(raw.requirementMap ?? {}, 'requirementMap');
  const requirementMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(requirementMapRaw)) {
    requirementMap[key] = stringValue(value, `requirementMap.${key}`);
  }
  const auth = raw.auth ?? 'aioauth';
  if (auth !== 'aioauth' && auth !== 'basic') {
    throw new Error("auth must be 'aioauth' or 'basic'.");
  }
  const apiBaseUrl = stringValue(
    process.env.AIO_API_BASE_URL ?? raw.apiBaseUrl,
    'apiBaseUrl',
  );
  try {
    new URL(apiBaseUrl);
  } catch {
    throw new Error('apiBaseUrl must be a valid URL.');
  }
  const cfg: SyncConfig = {
    ...raw,
    apiBaseUrl,
    projectKey: stringValue(
      process.env.AIO_PROJECT_KEY ?? raw.projectKey,
      'projectKey',
    ),
    auth,
    scriptType: stringValue(raw.scriptType, 'scriptType', 'BDD'),
    folderTemplate: stringValue(raw.folderTemplate, 'folderTemplate'),
    defaults: {
      status: stringValue(defaults.status, 'defaults.status', 'Published'),
      type: typeof defaults.type === 'string' ? defaults.type : '',
      owner: typeof defaults.owner === 'string' ? defaults.owner : '',
      tags: stringArray(defaults.tags, 'defaults.tags'),
      labels: stringArray(defaults.labels, 'defaults.labels'),
    },
    requirement: {
      ...requirement,
      prdPathTemplate: stringValue(
        requirement.prdPathTemplate,
        'requirement.prdPathTemplate',
        'docs/PRDs/{feature}.md',
      ),
    },
    requirementMap,
  };
  return {
    ...cfg,
  };
}

/** Build the AIO Authorization header (AioAuth token, or Basic email:token). */
export function authHeader(cfg: SyncConfig, token: string, email?: string): string {
  if (cfg.auth === 'basic' && email) {
    return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  }
  return `AioAuth ${token}`;
}

export interface ConnectivityResult {
  ok: boolean;
  status: number | null;
  detail: string;
}

/**
 * Read-only connectivity probe: an authenticated GET against the project's
 * test-case listing. Distinguishes token failure (401), permission (403),
 * wrong project/path (404), and network reachability — enough to validate the
 * token + base + projectKey before the sync stage runs. Never writes.
 */
export async function checkConnectivity(
  cfg: SyncConfig,
  token: string,
  email?: string,
): Promise<ConnectivityResult> {
  const url = `${cfg.apiBaseUrl}/project/${cfg.projectKey}/testcase?maxResults=1`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(cfg, token, email), Accept: 'application/json' },
    });
    if (res.ok) {
      return { ok: true, status: res.status, detail: `authenticated; project ${cfg.projectKey} reachable` };
    }
    const snippet = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
    const detail =
      res.status === 401
        ? 'token invalid or expired (401) — check AIO_API_TOKEN in your .env'
        : res.status === 403
          ? `authenticated but no permission on project ${cfg.projectKey} (403)`
          : res.status === 404
            ? `not found (404) — verify projectKey "${cfg.projectKey}" and apiBaseUrl "${cfg.apiBaseUrl}" against the AIO Swagger`
            : `unexpected ${res.status}: ${snippet}`;
    return { ok: false, status: res.status, detail };
  } catch (err) {
    return {
      ok: false,
      status: null,
      detail: `could not reach ${cfg.apiBaseUrl}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
