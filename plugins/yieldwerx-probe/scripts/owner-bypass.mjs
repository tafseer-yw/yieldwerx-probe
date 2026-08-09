#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PROBE_OWNER = Object.freeze({
  name: 'Tafseer Haider',
  email: 'tafseer.haider@yieldwerx.com',
  authority: 'PROBE Owner / Allrounder',
});

const RECEIPT_KIND = 'probe-owner-bypass';
const DEFAULT_TTL_MINUTES = 15;
const MAX_TTL_MINUTES = 60;

function usage(exitCode = 0) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`PROBE Owner bypass

Usage:
  probe owner-bypass setup [--rotate]
  probe owner-bypass authorize <feature-slug> --item "<stage/gate/item>" --reason "<reason>" [--scope feature|CAT-NN] [--ttl-minutes 15]
  probe owner-bypass verify <receipt-path> [--json]
  probe owner-bypass consume <receipt-path> --ledger <ledger-path> [--json]

The authorize command asks for the PIN through hidden terminal input. Never put
the PIN in a command argument, chat message, ledger, or artifact.
`);
  process.exit(exitCode);
}

function stableCore(receipt) {
  return {
    schemaVersion: receipt.schemaVersion,
    kind: receipt.kind,
    authorizationId: receipt.authorizationId,
    owner: receipt.owner,
    featureSlug: receipt.featureSlug,
    item: receipt.item,
    scope: receipt.scope,
    reason: receipt.reason,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    nonce: receipt.nonce,
  };
}

function requireSigningKey(signingKey) {
  if (typeof signingKey !== 'string' || signingKey.length < 32) {
    throw new Error(
      'PROBE_OWNER_BYPASS_SIGNING_KEY must be a private value of at least 32 characters. Run `probe owner-bypass setup`.',
    );
  }
}

function signatureFor(receipt, signingKey) {
  requireSigningKey(signingKey);
  return crypto
    .createHmac('sha256', signingKey)
    .update(JSON.stringify(stableCore(receipt)))
    .digest('hex');
}

export function pinsMatch(expected, candidate) {
  if (typeof expected !== 'string' || typeof candidate !== 'string') return false;
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  const candidateDigest = crypto.createHash('sha256').update(candidate).digest();
  return crypto.timingSafeEqual(expectedDigest, candidateDigest);
}

export function createReceipt(
  { featureSlug, item, scope = 'feature', reason, ttlMinutes = DEFAULT_TTL_MINUTES },
  now = new Date(),
  signingKey,
) {
  requireSigningKey(signingKey);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(featureSlug ?? '')) {
    throw new Error('feature-slug must be lowercase kebab-case.');
  }
  if (typeof item !== 'string' || item.trim().length < 3) {
    throw new Error('--item must name the exact PROBE stage, gate, check, or evidence item.');
  }
  if (typeof reason !== 'string' || reason.trim().length < 5) {
    throw new Error('--reason must explain why the bypass is accepted.');
  }
  if (scope !== 'feature' && !/^CAT-\d{2,}$/i.test(scope)) {
    throw new Error('--scope must be feature or CAT-NN.');
  }
  const ttl = Number(ttlMinutes);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TTL_MINUTES) {
    throw new Error(`--ttl-minutes must be an integer from 1 to ${MAX_TTL_MINUTES}.`);
  }

  const issuedAt = now.toISOString();
  const receipt = {
    schemaVersion: 1,
    kind: RECEIPT_KIND,
    authorizationId: `PBA-${crypto.randomUUID()}`,
    owner: PROBE_OWNER,
    featureSlug,
    item: item.trim(),
    scope: scope.toUpperCase() === 'FEATURE' ? 'feature' : scope.toUpperCase(),
    reason: reason.trim(),
    issuedAt,
    expiresAt: new Date(now.getTime() + ttl * 60_000).toISOString(),
    nonce: crypto.randomBytes(16).toString('hex'),
    status: 'active',
    secretIncluded: false,
  };
  return { ...receipt, signature: signatureFor(receipt, signingKey) };
}

export function validateReceipt(receipt, now = new Date(), signingKey) {
  const errors = [];
  try {
    requireSigningKey(signingKey);
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
  if (!receipt || typeof receipt !== 'object') return { valid: false, errors: ['invalid JSON'] };
  if (receipt.schemaVersion !== 1) errors.push('unsupported schemaVersion');
  if (receipt.kind !== RECEIPT_KIND) errors.push('wrong receipt kind');
  if (
    receipt.owner?.name !== PROBE_OWNER.name ||
    receipt.owner?.email !== PROBE_OWNER.email ||
    receipt.owner?.authority !== PROBE_OWNER.authority
  ) {
    errors.push('owner identity does not match the PROBE Owner');
  }
  if (receipt.secretIncluded !== false) errors.push('receipt must never contain a secret');
  const expectedSignature = signatureFor(receipt, signingKey);
  const suppliedSignature = receipt.signature;
  if (
    typeof suppliedSignature !== 'string' ||
    !pinsMatch(expectedSignature, suppliedSignature)
  ) {
    errors.push('receipt signature check failed');
  }
  if (receipt.status !== 'active') errors.push(`receipt is ${receipt.status ?? 'not active'}`);
  const expiry = Date.parse(receipt.expiresAt ?? '');
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) errors.push('receipt has expired');
  return { valid: errors.length === 0, errors };
}

export function consumeReceipt(receipt, ledgerPath, now = new Date(), signingKey) {
  const validation = validateReceipt(receipt, now, signingKey);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  return {
    ...receipt,
    status: 'consumed',
    consumedAt: now.toISOString(),
    recordedIn: ledgerPath,
  };
}

function parseOptions(args) {
  const positional = [];
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }
    if (value === '--json' || value === '--rotate') {
      options[value.slice(2)] = true;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`Missing value for ${value}.`);
    options[value.slice(2)] = next;
    index += 1;
  }
  return { positional, options };
}

function resolveInside(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the consumer repository.`);
  }
  return resolved;
}

async function readHiddenPin(prompt = 'Enter PROBE Owner bypass PIN: ') {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error(
      'PIN entry requires an interactive terminal. Run this command yourself; do not send the PIN through Claude.',
    );
  }
  process.stdout.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Authorization cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ') value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

function setEnvValue(content, name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  if (pattern.test(content)) return content.replace(pattern, line);
  const separator = content === '' || content.endsWith('\n') ? '' : '\n';
  return `${content}${separator}${line}\n`;
}

async function setupSecrets(root, rotate) {
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '.env'], {
    cwd: root,
    windowsHide: true,
  });
  if (ignored.status !== 0) {
    throw new Error('Refusing setup because the consumer repository does not ignore .env.');
  }
  if (
    !rotate &&
    (process.env.PROBE_OWNER_BYPASS_PIN || process.env.PROBE_OWNER_BYPASS_SIGNING_KEY)
  ) {
    throw new Error('Owner bypass secrets already exist. Use setup --rotate to replace them.');
  }
  const pin = await readHiddenPin('Create a private 6-12 digit PROBE Owner bypass PIN: ');
  if (!/^\d{6,12}$/.test(pin)) throw new Error('PIN must contain 6-12 digits.');
  const confirmation = await readHiddenPin('Confirm the PIN: ');
  if (!pinsMatch(pin, confirmation)) throw new Error('PIN confirmation did not match.');
  const signingKey = crypto.randomBytes(32).toString('base64url');
  const envPath = path.join(root, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  content = setEnvValue(content, 'PROBE_OWNER_BYPASS_PIN', pin);
  content = setEnvValue(content, 'PROBE_OWNER_BYPASS_SIGNING_KEY', signingKey);
  fs.writeFileSync(envPath, content, { mode: 0o600 });
  process.stdout.write(
    `PROBE Owner bypass secrets ${rotate ? 'rotated' : 'configured'} in gitignored .env.\n` +
      'No secret value was printed. Existing receipts are invalid after rotation.\n',
  );
}

function readReceipt(root, receiptPath) {
  const authorizationRoot = path.join(root, '.probe', 'authorizations');
  const resolved = resolveInside(root, receiptPath, 'receipt path');
  const relative = path.relative(authorizationRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('receipt must be under .probe/authorizations/.');
  }
  return { resolved, receipt: JSON.parse(fs.readFileSync(resolved, 'utf8')) };
}

function printSafe(receipt, json) {
  const safe = {
    authorizationId: receipt.authorizationId,
    owner: receipt.owner,
    featureSlug: receipt.featureSlug,
    item: receipt.item,
    scope: receipt.scope,
    reason: receipt.reason,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    status: receipt.status,
  };
  process.stdout.write(
    json
      ? `${JSON.stringify(safe, null, 2)}\n`
      : `PROBE Owner bypass ${safe.authorizationId}: ${safe.status}\n` +
          `  owner: ${safe.owner.name} <${safe.owner.email}>\n` +
          `  feature: ${safe.featureSlug}\n` +
          `  item: ${safe.item}\n` +
          `  scope: ${safe.scope}\n` +
          `  expires: ${safe.expiresAt}\n`,
  );
}

async function main() {
  const [action, ...rawArgs] = process.argv.slice(2);
  if (!action || ['help', '--help', '-h'].includes(action)) usage();
  const root = process.cwd();
  const { positional, options } = parseOptions(rawArgs);

  if (action === 'setup') {
    await setupSecrets(root, options.rotate === true);
    return;
  }

  if (action === 'authorize') {
    const featureSlug = positional[0];
    if (!featureSlug) throw new Error('Missing feature-slug.');
    const expectedPin = process.env.PROBE_OWNER_BYPASS_PIN;
    if (!/^\d{6,12}$/.test(expectedPin ?? '')) {
      throw new Error(
        'PROBE_OWNER_BYPASS_PIN must be a private 6-12 digit value in the user environment or gitignored .env.',
      );
    }
    const signingKey = process.env.PROBE_OWNER_BYPASS_SIGNING_KEY;
    requireSigningKey(signingKey);
    const candidate = await readHiddenPin();
    if (!pinsMatch(expectedPin, candidate)) throw new Error('Authorization failed.');
    const receipt = createReceipt({
      featureSlug,
      item: options.item,
      scope: options.scope,
      reason: options.reason,
      ttlMinutes: options['ttl-minutes'] ?? DEFAULT_TTL_MINUTES,
    }, new Date(), signingKey);
    const directory = path.join(root, '.probe', 'authorizations', featureSlug);
    fs.mkdirSync(directory, { recursive: true });
    const receiptPath = path.join(directory, `${receipt.authorizationId}.json`);
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    printSafe(receipt, options.json);
    process.stdout.write(`  receipt: ${path.relative(root, receiptPath).replaceAll('\\', '/')}\n`);
    return;
  }

  const receiptPath = positional[0];
  if (!receiptPath) throw new Error('Missing receipt path.');
  const signingKey = process.env.PROBE_OWNER_BYPASS_SIGNING_KEY;
  requireSigningKey(signingKey);
  const loaded = readReceipt(root, receiptPath);
  if (action === 'verify') {
    const result = validateReceipt(loaded.receipt, new Date(), signingKey);
    if (!result.valid) throw new Error(result.errors.join('; '));
    printSafe(loaded.receipt, options.json);
    return;
  }
  if (action === 'consume') {
    if (!options.ledger) throw new Error('Missing --ledger path.');
    const ledger = resolveInside(root, options.ledger, 'ledger path');
    if (!fs.existsSync(ledger)) throw new Error(`Ledger not found: ${options.ledger}`);
    const relativeLedger = path.relative(root, ledger).replaceAll('\\', '/');
    const consumed = consumeReceipt(loaded.receipt, relativeLedger, new Date(), signingKey);
    fs.writeFileSync(loaded.resolved, `${JSON.stringify(consumed, null, 2)}\n`, { mode: 0o600 });
    printSafe(consumed, options.json);
    return;
  }
  usage(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
