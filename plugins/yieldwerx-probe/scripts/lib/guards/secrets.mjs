/**
 * Credential guard for writes.
 *
 * Ported from the OphyCare CARES guard suite with the PHI rules removed -
 * those encode a healthcare domain SIFT does not have. What remains is the
 * part that is true everywhere: a live key committed to a repository is a
 * rotation incident regardless of intent.
 *
 * Every pattern here is specific enough to name the vendor. A generic
 * "long random string" rule fires on minified assets, lock files and UUID
 * fixtures, which is how a scanner earns its way into the ignore list.
 *
 * Zero dependencies: node: builtins only.
 */

import { mask } from "./hook-io.mjs";

export const CREDENTIAL_RULES = [
  { id: "aws-access-key", label: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "github-token", label: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{16,}\b/g },
  { id: "github-pat", label: "GitHub fine-grained PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: "anthropic-key", label: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "openai-key", label: "OpenAI-style API key", re: /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/g },
  { id: "slack-token", label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "google-api-key", label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "stripe-live", label: "Stripe live secret key", re: /\bsk_live_[0-9A-Za-z]{16,}\b/g },
  { id: "private-key", label: "private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: "jdbc-inline-password", label: "database URL with an inline password",
    re: /jdbc:[a-z0-9]+:[^\s"']*[?&;]password=[^\s"'&;]+/gi },
  { id: "assigned-secret", label: "hard-coded secret assignment",
    re: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["'`]([^"'`\n]{8,})["'`]/gi,
    valueGroup: 1 },
  { id: "properties-password", label: "hard-coded password (properties/yaml style)",
    re: /^[ \t]*[\w.-]*(?:password|passwd|pwd)\s*[=:][ \t]*([^\s"'#$`{][^\s#]{7,})$/gim,
    valueGroup: 1 },
];

/**
 * Values that are obviously not live credentials.
 *
 * Anchored at the start for template markers, unanchored for the placeholder
 * vocabulary - `your_password_here` carries its tell in the middle, and an
 * end-anchored test misses every one of those.
 */
const PLACEHOLDER =
  /^[<{[$*]|\b(?:example|placeholder|your[_-]?\w*|xxx+|change[_-]?me|dummy|fake|sample|redacted|todo|test\w*|n\/a|null|none)\b|\*{3,}/i;
const INDIRECTION =
  /process\.env|os\.getenv|os\.environ|System\.getenv|@Value\s*\(|\$\{|\{\{|config\.get|Deno\.env|getenv\(|ENV\[|dotenv/i;

/** Files whose whole purpose is to hold a credential. Writing one is a human act. */
export const SECRET_PATH_RULES = [
  { id: "env-file", label: "environment file", re: /(^|[\\/])\.env(\.[\w-]+)?$/i, allow: /\.(example|sample|template)$/i },
  { id: "pem", label: "certificate/key file", re: /\.(pem|key|p12|pfx|jks|keystore)$/i },
  { id: "ssh-key", label: "SSH private key", re: /(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)$/i },
  { id: "cloud-creds", label: "cloud credential file",
    re: /(^|[\\/])((application_default_)?credentials(\.json)?|service[-_]?account[^\\/]*\.json|\.npmrc|\.pypirc)$/i },
];

const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const allowlisted = (value, line) => PLACEHOLDER.test(value.trim()) || INDIRECTION.test(line);

export function scanContent(content) {
  const findings = [];
  const text = String(content ?? "");
  if (!text) return findings;
  const lines = text.split("\n");

  for (const rule of CREDENTIAL_RULES) {
    for (const m of text.matchAll(rule.re)) {
      const value = rule.valueGroup ? m[rule.valueGroup] : m[0];
      if (!value) continue;
      const line = lines[lineOf(text, m.index) - 1] ?? "";
      if (allowlisted(value, line)) continue;
      findings.push({ rule: rule.id, label: rule.label, line: lineOf(text, m.index), excerpt: mask(value) });
    }
  }
  return findings;
}

export function secretPathRule(filePath) {
  const p = String(filePath ?? "");
  for (const rule of SECRET_PATH_RULES) {
    if (!rule.re.test(p)) continue;
    if (rule.allow?.test(p)) continue;
    return rule;
  }
  return null;
}

export function secretsVerdict({ filePath, content }) {
  const pathRule = secretPathRule(filePath);
  if (pathRule) {
    return {
      decision: "deny",
      findings: [{ rule: pathRule.id, label: pathRule.label, line: 0, excerpt: "" }],
      reason:
        `PROBE guard: refusing to write ${filePath}\n` +
        `That path is a ${pathRule.label} - putting a credential there is a human act, not one to ` +
        `delegate. Say which value belongs in which key and let the owner add it.\n` +
        `Override: PROBE_ALLOW_SECRET_WRITE=1`,
    };
  }

  const findings = scanContent(content);
  if (!findings.length) return null;

  return {
    decision: "deny",
    findings,
    reason:
      `PROBE guard: this write carries a credential.\n` +
      findings.map((f) => `  line ${f.line}: ${f.label} (${f.excerpt})`).join("\n") +
      `\n\nA live key in the repository is a rotation incident regardless of intent. Use the environment ` +
      `or config indirection this repository already uses, and never paste the value into chat.\n` +
      `Override: PROBE_ALLOW_SECRET_WRITE=1`,
  };
}
