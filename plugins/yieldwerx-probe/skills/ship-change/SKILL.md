---
name: ship-change
user-invocable: true
description: Use when a reviewed development change is ready to leave the working tree — pre-commit hygiene, local commits that explain why, a pull-request body carrying the evidence, or both. Never pushes or opens a pull request without explicit human authorization, and never merges. PROBE development track.
track: dev
safety: writes-local
produces: the requested local commits and/or pull-request body; .probe/artifacts/<feature>/70-build/ship-notes.md
consumes: the change to ship and the configured lint, typecheck, and test command results. A build/revision/fix report and a code review are optional enrichment, never required.
argument-hint: <feature-slug> [commit|describe|both] [--push] [--open-pr] [--base <ref>]
graph:
  consumes:
    [code:changed-files, artifact:70-build/build-report.md?, artifact:70-build/code-review.md?]
  produces: [artifact:70-build/ship-notes.md]
  next: [skill:probe-implementation, skill:ui-recon, skill:api-recon, skill:change-impact]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent.

# Ship Change

## Why

The last mile is where a good change becomes an unreviewable one: a commit that
says "fixes", a pull request with no evidence, a secret committed by accident,
and no mention anywhere that forty approved test cases now assert a label that
no longer exists. This skill makes the hand-off carry what the next person needs
— including the QA track, which otherwise discovers the invalidation by watching
a suite go red.

## What

The requested local shipping output: commits whose messages explain why the
change exists, a pull-request body carrying the intent and evidence, or both.
The default mode is `both`.

## When

Run it after `/review-code` returns `GO`. Running it on an unreviewed change is
allowed — the pull-request body says so, where a reviewer will see it.

**No gate is consulted.** The Merge Gate governs automation branches in the QA
track and has no bearing on whether application code can be committed or
proposed here.

## Where

The consumer repository's working tree and its configured remote. Ship notes go
to the configured `70-build` artifact directory.

## How

Scan for what must never be committed, group the work into commits that each
say why, assemble the body from the evidence that already exists, and stop at
the boundary of any action that leaves this machine.

## Preconditions — refuse if any fails

1. Resolve the action mode before touching Git: `commit` creates local commits
   only; `describe` prepares the pull-request body and ship notes without
   staging, committing, or pushing; `both` does both and is the default. Reject
   `--push` with `describe`, and reject `--open-pr` with `commit`, because each
   requests an outward action whose required local output was excluded.
2. `--push`, `--open-pr`, or any other outward action requires explicit human
   authorization in the invoking request. Absent it, prepare everything and
   stop:
   > "Prepared. Nothing has been pushed. Re-run with `--push` (and `--open-pr`
   > if wanted) to send it."
3. The current branch is not a deployment branch. Committing to one is refused
   outright, not warned about.
4. Unrelated working-tree changes are preserved. If the tree holds work this
   change does not own, stage selectively and say so — never `add -A` over
   someone else's edit.

## Procedure

1. **Resolve the comparison base and scan before staging.** Use `--base <ref>`
   as both the change-set comparison base and pull-request target. When it is
   absent, resolve the repository's configured default branch and record it;
   never guess `main`. Read the full diff and stop on anything that must
   not be committed: credentials, tokens, connection strings, a machine-specific
   absolute path, a personal environment file, generated output the repository
   ignores, a debugging hook, or a commented-out block left behind. Each one is a
   halt, not a note.
2. **Run the hygiene set.** The configured `lintCode`, `typecheck`, and
   formatting commands, plus `git diff --check`. Red means stop; this skill does
   not ship a change that the repository's own gates reject.
3. **Confirm the obligations are met.** The review's unmet-obligation list is
   empty, or each remaining item is carried deliberately and named in the body.
   Shipping an endpoint that is missing from the served API document is how the
   next recon pass finds drift.
4. **Commit only for `commit` or `both`.** Group the change into commits that
   each say why. One coherent change per commit.
   The subject states what changed in the imperative; the body states **why it
   changed** and what it deliberately did not do. Cite the AC ids or the defect
   id. A message that restates the diff adds nothing a reader could not already
   see.
5. **Describe only for `describe` or `both`.** Assemble the pull-request body
   from evidence that already exists rather than from a fresh summary:
   - what this change does, and the AC ids or defect it satisfies;
   - the design decisions that a reviewer would otherwise have to reverse-engineer;
   - the verification output — commands run and their results;
   - the `/review-code` verdict, or an explicit statement that no review ran;
   - the observability added: test ids, API operations, readable results;
   - **the downstream-invalidation list** — the exact feature files, TC ids,
     locator entries, recon artifacts, and fixtures this change makes stale,
     each with its routing, or an explicit "none — no QA artifacts in this
     repository" where that is the truth;
   - what is deliberately deferred, and why.
6. **Stop at the boundary.** In `describe` mode, confirm that the index and
   commit graph are unchanged. In `commit` or `both`, push only with `--push`.
   Open a pull request only in `describe` or `both` with `--open-pr`, targeting
   the resolved base, and never merge. Report exactly what was done and what
   was not.
7. **Write ship notes.** `70-build/ship-notes.md`: the commits created, the
   hygiene results, the body as sent or prepared, the outward actions taken and
   authorized by whom, and the invalidation list repeated so it survives outside
   the pull request.

## Boundaries

- **Never push, open, comment on, or merge anything without explicit
  authorization in the request.** Preparing is the default; sending is the
  exception.
- **Never merge, ever.** Merge authorization belongs to the repository's own
  protection rules and, for automation branches, to the QA track's Merge Gate.
- **Never bypass a repository hook.** A hook that fails is a finding to fix, not
  a flag to disable.
- **Never rewrite published history.** Amend only commits that exist solely on
  this machine.
- **Never invent evidence.** A verification result in the body is one that
  actually ran; if a command could not run, the body says so rather than
  omitting it.
- Secrets, tokens, and machine-specific paths never enter a commit message, a
  pull-request body, or the ship notes.

## Closing state

End in exactly one of the four D12 states — `COMPLETE` /
`COMPLETE_WITH_NOTES` / `BLOCKED` / `NEEDS_INFO` — with the real verification
output attached to `COMPLETE` and a recommended answer attached to
`NEEDS_INFO`. Never report `COMPLETE` for work whose verification was not run.
