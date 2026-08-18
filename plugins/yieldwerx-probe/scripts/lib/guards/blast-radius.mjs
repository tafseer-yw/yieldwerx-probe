/**
 * Blast-radius guard for shell commands.
 *
 * Two families, one of which is specific to this repository and is the reason
 * the guard exists here at all.
 *
 * LIVE AIO WRITES. adapters/aio/scripts/aio-sync.ts is 1237 lines that write
 * to a production Jira tenant, and its nine documented traps are verified only
 * by string-presence markers in the repository validator - never executed. One
 * of those traps, a PUT without `/detail`, "once triggered a multi-hour hunt
 * for a non-existent mass delete"; another silently deletes datasetParameters
 * when a payload omits one of a required pair. PROBE already defaults every
 * AIO write to dry-run and requires `--live` to mean it, which is the right
 * design - so this guard targets `--live` exactly. A dry run says nothing.
 *
 * GIT HISTORY. Rewrites and shared-ref deletion, denied for the same reason
 * everywhere: the damage lands on other clones and no local undo reaches it.
 *
 * Calibration: deny what is never correct, ask what deserves one human beat,
 * stay silent otherwise. A guard that fires on ordinary work gets switched off
 * within a day, and then protects nothing.
 *
 * Zero dependencies: node: builtins only.
 */

export const PROTECTED_BRANCH = /^(?:main|master|dev|develop|release[/-][\w.-]+|prod|production)$/i;

const GIT = String.raw`\bgit(?:\s+(?:-c\s+\S+|--\S+(?:=\S+)?|-[a-zA-Z]))*\s+`;
const rx = (body, flags = 'i') => new RegExp(GIT + body, flags);

/** Never correct: the damage leaves this machine. */
const GIT_DENY = [
  {
    id: 'force-push',
    label: 'force push - overwrites history other clones already have',
    re: rx(String.raw`push\b(?=[^|;&]*\s(?:--force\b(?!-with-lease)|-f\b))`),
  },
  {
    id: 'plus-refspec-push',
    label: 'force push via a +refspec - the same overwrite, spelled differently',
    re: rx(String.raw`push\b[^|;&]*\s\+[\w./-]+:`),
  },
  {
    id: 'push-mirror',
    label: 'mirror push - replaces every ref on the remote',
    re: rx(String.raw`push\b[^|;&]*\s--mirror\b`),
  },
  {
    id: 'filter-branch',
    label: 'history rewrite across the whole repository',
    re: rx(String.raw`(?:filter-branch|filter-repo)\b`),
  },
  {
    id: 'reflog-expire',
    label: 'reflog expiry - removes the safety net that makes commits recoverable',
    re: rx(String.raw`reflog\s+expire\b`),
  },
];

/** Destroys work that exists nowhere else. */
const GIT_ASK = [
  {
    id: 'reset-hard',
    label: 'hard reset - discards every uncommitted change',
    re: rx(String.raw`reset\b[^|;&]*\s--hard\b`),
  },
  {
    id: 'clean-force',
    label: 'forced clean - deletes untracked files, including ones never committed',
    re: rx(String.raw`clean\b[^|;&]*\s(?:-[a-zA-Z]*f[a-zA-Z]*\b|--force\b)`),
  },
  {
    id: 'checkout-discard',
    label: 'discards working-tree changes',
    re: rx(String.raw`(?:checkout|restore)\b[^|;&]*\s(?:--\s+)?\.(?:\s|$)`),
  },
  {
    id: 'branch-force-delete',
    label: 'force branch deletion - drops unmerged commits',
    re: rx(String.raw`branch\b[^|;&]*\s-D\b`),
  },
  {
    id: 'stash-drop',
    label: 'stash removal - stashed work has no other copy',
    re: rx(String.raw`stash\s+(?:drop|clear)\b`),
  },
  {
    id: 'force-with-lease',
    label: 'force push with lease - safer, still a history rewrite',
    re: rx(String.raw`push\b[^|;&]*\s--force-with-lease\b`),
  },
];

const DELETE_REMOTE = rx(String.raw`push\b[^|;&]*\s(?:--delete\b|-d\b|:\s*[\w./-]+)`);

/**
 * A live AIO write.
 *
 * Matches the CLI (`probe aio sync ... --live`) and the configured npm alias
 * (`npm run sync:cases -- --live`), because a consumer reaches it either way.
 * `--live` is the whole signal: PROBE is dry-run by default, so its absence
 * means nothing is written and the guard stays quiet.
 */
const AIO_LIVE = /(?:\bprobe\s+aio\s+sync\b|\bsync:cases\b|\baio-sync\b)[^|;&]*\s--live\b/i;

export function stripProsePayloads(command) {
  return String(command ?? '')
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\s*\2\s*$/gm, ' HEREDOC ')
    .replace(
      /((?:^|\s)-[a-zA-Z]*m|(?:^|\s)--message)(\s*=?\s*)(["'])(?:\\.|(?!\3)[\s\S])*?\3/g,
      '$1 MSG',
    );
}

export function clausesOf(command) {
  return stripProsePayloads(command)
    .split(/(?:&&|\|\||[;\n]|\|)/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function redact(command) {
  return (
    String(command ?? '')
      .replace(/(https?:\/\/)[^\s/@]+@/gi, '$1***@')
      // AIO_API_TOKEN=... on the command line is a credential in the transcript.
      .replace(/\b([A-Z_]*TOKEN|[A-Z_]*API_KEY)=\S+/g, '$1=***')
  );
}

export function targetBranches(clause) {
  const out = [];
  for (const m of clause.matchAll(
    /(?:^|\s)(?:\+)?(?:refs\/heads\/)?([A-Za-z0-9_][\w.-]*(?:\/[\w.-]+)*)(?=\s|:|$)/g,
  ))
    out.push(m[1]);
  for (const m of clause.matchAll(/(?:^|\s)\+?:(?:refs\/heads\/)?([\w.-]+(?:\/[\w.-]+)*)/g))
    out.push(m[1]);
  return out;
}

/** Is this clause a live AIO write? */
export function liveAioWrite(clause) {
  return AIO_LIVE.test(clause);
}

export function blastRadiusVerdict({ command }) {
  const hits = [];

  for (const clause of clausesOf(command)) {
    for (const rule of GIT_DENY)
      if (rule.re.test(clause)) hits.push({ decision: 'deny', ...rule, clause });
    if (DELETE_REMOTE.test(clause)) {
      const branches = targetBranches(clause).filter((b) => PROTECTED_BRANCH.test(b));
      if (branches.length) {
        hits.push({
          decision: 'deny',
          id: 'delete-remote-branch',
          label: `remote branch deletion (${branches.join(', ')})`,
          clause,
        });
      }
    }
    for (const rule of GIT_ASK)
      if (rule.re.test(clause)) hits.push({ decision: 'ask', ...rule, clause });
    if (liveAioWrite(clause)) {
      hits.push({
        decision: 'ask',
        id: 'aio-live-write',
        label: 'live AIO sync - writes to the production Jira tenant, not a dry run',
        clause,
      });
    }
  }

  if (!hits.length) return null;

  const deny = hits.filter((h) => h.decision === 'deny');
  const list = (hs) => hs.map((h) => `  ${h.label}\n    in: ${redact(h.clause)}`).join('\n');

  if (deny.length) {
    return {
      decision: 'deny',
      findings: hits,
      reason:
        `PROBE guard: this rewrites or deletes shared git history.\n${list(deny)}\n\n` +
        'The damage lands on every other clone and no local undo reaches it. If the history really must ' +
        'change, that is a decision to make with whoever owns the branch, and to run by hand.\n' +
        'Override for exactly this command: prefix it with PROBE_ALLOW_UNSAFE_GIT=1',
    };
  }

  const aio = hits.some((h) => h.id === 'aio-live-write');
  return {
    decision: 'ask',
    findings: hits,
    reason:
      `PROBE guard: confirm before this runs.\n${list(hits)}\n\n` +
      (aio
        ? "This is a live write to the production Jira tenant. The adapter's payload rules are pinned by " +
          'markers in the repository validator but never executed by a test, and its known traps delete ' +
          'dataset parameters or wipe case fields when a payload is shaped wrongly. Confirm the dry-run ' +
          'plan was reviewed and that this is the intended target set.'
        : 'This discards work that exists nowhere else. Uncommitted changes are not in the reflog; if ' +
          'anything in the working tree matters, commit or stash it first.'),
  };
}
