---
name: handoff
user-invocable: true
description: Use when work must stop before it is finished — end of day, a context limit, a switch to something urgent. Writes the picture the NEXT session needs: what changed, what is verified with the real command output, what is still red, decisions not to relitigate, approaches already rejected, and one concrete next step with a resume command. Also lists and closes open handoffs. Facts are established from git and real verification output, never from memory of the conversation.
track: shared
safety: writes-local
produces: .probe/artifacts/handoffs/<slug>.md
consumes: the state of the current session and working tree
argument-hint: '[<slug>] | close <slug> | list'
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Handoff

## Why

Skill-to-skill continuity already works — a spec analysis written today is
consumed by Case Forge tomorrow. **Session**-to-session continuity does not:
when a session ends mid-task, everything not written down is gone — which
branch, which verification actually passed, why the obvious approach was
abandoned, what the next move was going to be. The next session then re-reads
the same files to rebuild a picture that already existed. This skill writes
that picture once.

## What

`.probe/artifacts/handoffs/<slug>.md` — a one-minute read the next session can
act on, its facts established from `git status` and real verification output
rather than remembered.

## When

At any stopping point mid-work, on either track. `close <slug>` when the work
lands; `list` to see what is open. One handoff per line of work, not per
session — two sessions on the same feature update the same file.

## Where

The consumer's configured artifacts directory, under `handoffs/`. Handoffs may
be committed; they carry no secrets and no tenant data, ever.

## How

Pick the slug from the work, establish the facts from the tree, write the
fixed sections, and keep every claim honest — `not run` is a useful handoff;
a false `passing` costs the next session more than the honesty would have.

## Procedure

1. **Pick the slug from the work, not the date** — `upload-status-board`,
   `cluster-inking-fix`. Reuse the existing slug when continuing that work;
   overwrite rather than accumulating `-v2` files.

2. **Establish the facts before writing.** Do not describe from memory:
   - `git status --short --branch` and `git log --oneline -5`;
   - the actual result of the last verification run, with its command;
   - anything uncommitted, named.

3. **Write the fixed sections.** Every one answerable in a line or two — a
   handoff nobody can read in a minute does not get read:

   ```markdown
   # Handoff: <slug>
   branch: <branch>
   updated: <YYYY-MM-DD>
   status: open            # `closed` when the work lands

   ## Goal
   What this work is for, in one or two sentences.

   ## State of the work
   What is done and working — functional description, not a diff.

   ## Changed, not yet committed
   Files with uncommitted edits and what each change does. `none` if clean.

   ## Verification
   What was actually run, with the command and the real result. Say `not run`
   where it was not run — never imply a check that did not happen.

   ## Open problems
   What is red, unknown, or unresolved. `none` if nothing.

   ## Decisions made
   Choices the next session should not relitigate, each with its reason.

   ## Rejected approaches
   What was tried and abandoned, and why — the most expensive thing to
   rediscover.

   ## Next step
   ONE concrete action, specific enough to start immediately.

   ## Resume command
   A copy-pasteable line that puts the next session back to work, e.g.
   `/yw:green-run <feature>` or `/yw:fix-defect <feature> "<symptom>"`.
   ```

4. **Close it when the work lands** — `status: closed`, or
   `/yw:handoff close <slug>`. A stale open handoff is worse than none: it
   points the next session at a world that has moved on.

5. **`list`** reads the handoffs directory and reports each open one with its
   branch, age, and next step. Flag anything older than 14 days as probably
   stale.

## Boundaries

- **Never claim a verification that was not run.** Paste the real command and
  its real result, or write `not run`.
- **No secrets, no tenant data, no credentials** — handoffs may be committed
  and are read into a future session's context.
- **Do not invent motivation.** If why an approach was abandoned was not
  recorded, write what was observed and say the reason was not recorded.
- **A handoff does not replace an artifact.** A bug dossier, build report, or
  spec analysis stays where it belongs; the handoff points at it rather than
  repeating it.
