/**
 * Shared PreToolUse plumbing for the PROBE guards.
 *
 * Two rules are encoded here, both learned the expensive way elsewhere:
 *
 *   1. A guard that cannot reach the model is decoration. Verdicts go out as
 *      the documented PreToolUse JSON contract on STDOUT, never as a stderr
 *      advisory the transcript swallows.
 *   2. A guard that fires on ordinary work gets switched off within a day, and
 *      then protects nothing. Silence is the default; `ask` carries what
 *      deserves a human beat; `deny` is reserved for what is never correct.
 *
 * Zero dependencies: node: builtins only, so this runs from a plugin cache
 * with no install step.
 */

const RANK = { allow: 0, ask: 1, deny: 2 };

/** Read the hook payload, or null for empty/malformed input. */
export async function readHookPayload(stream) {
  try {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    if (!chunks.length) return null;
    const text = Buffer.concat(chunks).toString("utf8").trim();
    return text ? JSON.parse(text) : null;
  } catch {
    // A parse failure is not this guard's finding to report, and blocking an
    // unrelated action because a payload arrived mangled is a false positive.
    return null;
  }
}

/** Fold several verdicts into one, keeping the strongest and losing no reason. */
export function mergeVerdicts(verdicts) {
  const real = verdicts.filter(Boolean);
  if (!real.length) return null;
  const decision = real.reduce((a, v) => (RANK[v.decision] > RANK[a] ? v.decision : a), "allow");
  if (decision === "allow") return null;
  return {
    decision,
    reason: real.map((v) => v.reason).join("\n\n"),
    findings: real.flatMap((v) => v.findings ?? []),
  };
}

/** Emit the PreToolUse decision on stdout - the channel that reaches the model. */
export function emitDecision(verdict, { write = (s) => process.stdout.write(s) } = {}) {
  if (!verdict) return false;
  write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: verdict.decision,
        permissionDecisionReason: verdict.reason,
      },
      systemMessage:
        verdict.decision === "deny"
          ? "PROBE guard blocked this - see the reason."
          : "PROBE guard wants the decision before this proceeds.",
    }),
  );
  return true;
}

/**
 * Mask a matched value so a secret never travels into the transcript.
 *
 * A guard that prints the credential it found has copied that credential into
 * the conversation log and every transcript upload.
 */
export function mask(value) {
  const s = String(value);
  if (s.length <= 8) return "*".repeat(s.length);
  return `${s.slice(0, 2)}${"*".repeat(Math.min(s.length - 4, 24))}${s.slice(-2)}`;
}

/** Is the named override set in the environment? */
export function overridden(name, env = process.env) {
  return env[name] === "1" || env[name] === "true";
}
