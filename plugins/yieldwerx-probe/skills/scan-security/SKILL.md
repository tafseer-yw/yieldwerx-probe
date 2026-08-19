---
name: scan-security
user-invocable: true
description: Use when the scannable OWASP Top 10:2025 categories must be run and triaged — dependency and supply-chain scanning (A03), SAST (A04/A05/A08), DAST baseline (A02/A04), and active API scan plus schema fuzzing (A05/A10). Drives the configured tools through a swappable adapter contract, maps findings to categories and the PROBE severity ladder, separates real findings from noise, and routes confirmed ones to /bug-report. Active scans require explicit target authorization and refuse closed without it. PROBE Security Scan stage.
track: scripting
safety: writes-local
produces: .probe/artifacts/<feature-or-scope>/75-security/security-scan.md, redacted raw tool output
consumes: the repository (deps/SAST), a running target (DAST/fuzz), the OpenAPI spec, references/integrations/security-tools.md, references/security/owasp-2025.md
argument-hint: <scope> [--verbs deps-scan,sast,baseline-scan,api-scan,fuzz] [--target <url> --authorize] [--env <name>]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Security Scan (OWASP 2025)

## Why

Half the OWASP 2025 categories are found by tools, and the value is not in
running a scanner — anyone can — but in driving the right verbs, mapping the
output to categories, and separating the real findings from the flood of noise
that gets a scanner switched off within a week.

## What

`security-scan.md`: per verb run, the findings mapped to their OWASP category
and the PROBE severity ladder, triaged into confirmed / needs-review / noise
with the reasoning, and the confirmed ones routed to `/bug-report`. Raw tool
output is archived, redacted.

## When

Run `deps-scan` and `sast` freely and often — they are read-only. Run
`baseline-scan`, `api-scan`, and `fuzz` against an authorized target, typically
after a build is deployed to a test environment, and always with explicit
authorization for that target.

## Where

Read the repository (static verbs) or a running target (dynamic verbs); write
the scan artifact under `75-security`. Never a shared or production target
without an approved window.

## How

Resolve the verbs and their engines from the adapter contract, enforce target
authorization on the active verbs, run each configured command, normalize and
map the findings, triage against known behavior, and route the confirmed ones.

**Adapter contract:**
[../../references/integrations/security-tools.md](../../references/integrations/security-tools.md).
**Category map:**
[../../references/security/owasp-2025.md](../../references/security/owasp-2025.md).

## Authorization — the hard rule

Active scanning sends attack traffic and is governed like a live AIO write and
a k6 load run:

- `deps-scan` and `sast` read the repository, send no traffic, and need no
  target authorization.
- `baseline-scan` against a live target, `api-scan`, and `fuzz` **refuse
  without `--authorize` and a named `--target` in the invoking request.**
  A production-looking target additionally requires an approved window stated
  in the request; a shared environment is refused outright. The skill fails
  closed — an unauthorized active scan is never "probably fine".

## Procedure

1. **Resolve verbs and engines.** `--verbs` narrows; default is every verb with
   a configured command. An unconfigured verb is reported unavailable (its
   categories then show as `not scanned` in the report), never guessed.
2. **Enforce authorization** per the hard rule before any active verb runs.
   Record the authorization (who, which target, which window) in the artifact
   header.
3. **Run each verb** through its configured command. Capture the exit status
   and raw output; a tool that could not run is `blocked` with the command and
   error, not a silent skip that reads as "clean".
4. **Normalize and map.** Each finding → OWASP category + PROBE severity
   (a wrong-data or auth-bypass finding is `blocker` whatever the tool rated
   it) + location + redacted evidence + the tool's confidence.
5. **Triage — the part that earns the skill.** Sort findings into:
   - **confirmed** — reproduced or clearly real; routed to `/bug-report` with
     the category and evidence;
   - **needs-review** — plausible, needs a human judgment the scanner cannot
     make (is this endpoint actually reachable? is this "vulnerable" dependency
     function ever called?);
   - **noise** — false positive with the reason it is one, so the next run does
     not re-litigate it.
   Never route the whole tool dump to `/bug-report` — an unread flood is how a
   scanner's output gets ignored entirely.
6. **Write `security-scan.md`**: the header (verbs, engines, targets,
   authorization), findings by category and triage bucket, the confirmed list
   with bug references, and the categories not covered by this run. Cross-
   reference the authored cases from `/forge-security-tests` so the coverage
   picture is whole.
7. **Report** the confirmed count by severity and the coverage gaps; close in a
   dev-track-style state (`COMPLETE`/`COMPLETE_WITH_NOTES`/`BLOCKED`).

## Boundaries

- **Findings are repository-only** — no security finding, and no scan result,
  goes to AIO.
- **Redact everything sensitive** — secrets, tokens, PHI/PII — from the
  artifact and the archived raw output. A security report is the worst place
  to leak a credential.
- The scanned categories complement the authored ones; this skill never claims
  to cover A01/A06/A09 (authored) — the report names them as out of its scope
  and points at `/forge-security-tests`.
- No exploitation beyond what the configured scan performs, and no scanning of
  a third party's systems — only the consumer's own authorized targets.
