---
name: update-cases
user-invocable: true
description: Use when existing designed test cases need targeted amendment rather than redesign — an answered open question, a review finding, a spec change, a UI change-impact result, or a wrong expected value. Edits the affected scenarios in place, preserves TC ids and AIO keys, and records what the change invalidates downstream. Never regenerates a feature file. PROBE Case Forge amendment path.
track: design
safety: writes-shared
produces: amended features/<feature-slug>/*.feature (in place), .probe/artifacts/<feature>/20-cases/amendments/<date>-<n>.md, updated case-details.md / automation-plan.md / dev-handoff.md entries
consumes: features/<feature-slug>/*.feature, .probe/artifacts/<feature>/20-cases/*, .probe/artifacts/<feature>/10-spec/spec-analysis.md, docs/qa/<feature>/LEDGER.md
argument-hint: <feature-slug> -- <what needs to change>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Update Cases (targeted amendment)

## Why

Correct an existing approved case set without destroying stable identities,
traceability, review history, or downstream invalidation evidence.

## What

Amend only affected scenarios and supporting design records, preserving TC IDs
and external keys while recording supersession and impact.

## When

Use after an answered question, audit finding, specification change, UI impact,
or wrong expected value; use Case Forge when no case set exists.

## Where

Edit the consumer's configured feature files and `20-cases` records in place;
write an amendment record and update the ledger.

## How

Confirm a clean/approved target scope, map the trigger to exact ACs and TCs,
make the smallest procedural change, preserve identifiers, lint the result,
and explicitly reopen every invalidated audit, gate, script, or run.

Amend an **existing** case set in place. `/forge-cases` authors a category's cases
the first time; re-running it to change a few scenarios would renumber TC ids and
orphan the AIO records bound to them. Edit only what the change touches.

**Governing rule: identity is immutable.** A TC id names a durable AIO record, may
be bound to a script, and may carry execution evidence. Amend the case; never
re-mint its id.

## Inputs

- **feature-slug** — must already have `features/<feature-slug>/*.feature`.
- **the required change** — free text and/or a source artifact. Typical triggers:
  an **answered open question** (a `TODO(spec)` literal becomes real and a
  `deferred-until:Q-NN` disposition lifts — the most common case) · a **review
  finding** · a **spec change** · a **UI rename** (`/change-impact`, `ui:check`) ·
  a **wrong expected value** found in a run · a **disposition change**.

If the instruction is too vague to enumerate affected TC ids, **stop and produce
the change list first** for confirmation. Do not guess which scenarios to touch.

## Preconditions (refuse if unmet)

- `features/<feature-slug>/` exists with at least one `.feature` file.
- The working tree for `features/<feature-slug>/` is clean, or the user explicitly
  accepts amending over uncommitted edits — otherwise task 7's diff check is
  meaningless.
- **If the change alters the requirement itself, stop.** A new/changed/removed AC
  is a Spec Probe concern: rerun `/probe-spec` so `spec-analysis.md` carries it with
  stable ids, then amend the cases here. This skill changes _cases_, never
  requirements.

## Procedure

1. Add a row to the ledger's **Case amendments** table (create it on first use).
   Do **not** reset Case Forge to `in-progress` — the stage stayed done, and later
   stages need to see that an amendment landed after them.
2. **Resolve the change set before editing.** List, per affected TC id: what changes
   (title / description / steps / Examples rows / tags / expected value /
   disposition) and the one-line reason with its source (`Q-08 confirmed
2026-07-28`, `case-audit H-03`). Scenarios not on this list must not be touched.
3. **Classify each amendment** — this sets the blast radius:

   | Class            | What changed                                    | Consequence                                    |
   | ---------------- | ----------------------------------------------- | ---------------------------------------------- |
   | `text-only`      | wording; no expected value or step-count change | AIO body refresh                               |
   | `expected-value` | a literal, state, decision or baseline          | **prior run evidence is stale**                |
   | `structural`     | steps or Examples rows added/removed            | AIO body changes; a bound script likely breaks |
   | `scope`          | scenario added, superseded or retired           | coverage + manual-only count change            |

4. **Apply the edits in place.** Hard rules:
   - **Never renumber** a surviving TC id; never reuse a retired one.
   - **Never delete a scenario that has an AIO key.** Supersede it: keep it, add
     `@retired`, note `# Superseded by: TC-…-NNN` and the reason. Deleting it
     orphans the remote record and drops its history. A scenario with no AIO key yet
     may be deleted outright — say so in the record.
   - **New scenarios continue from the current maximum TC id across the whole
     feature** (not per file), so ids stay globally unique.
   - Preserve the AIO key tag, `@manual` and `@automated` exactly as found —
     amending a case never changes its automation state.
   - Keep the house style: QA-owned `@testtype:` only, `TC-… - Verify that …` title,
     description block, UI steps naming visible labels or API steps naming domain
     operations/outcomes, tag id matching the
     title. (Vocabulary: `${CLAUDE_PLUGIN_ROOT}/references/profiles/playwright-bdd/rules/coding-conventions.md`.)
5. **Update sibling artifacts for the touched entries only** — `case-details.md`,
   `automation-plan.md`, and `dev-handoff.md` if ownership moved between QA and dev.
   Do not reflow or re-sort untouched entries. There is no coverage matrix to
   update: the configured `requirementsCoverage` command regenerates it.
6. **Record the downstream invalidations** — the step most often skipped, and the
   one that makes an amendment safe:
   - **Design Gate approved?** An `expected-value`, `structural` or `scope`
     amendment invalidates the approval _for the touched cases_. Record a new
     approval requirement.
   - **Touched scenario `@automated`?** Name the step/page files bound to it and flag
     for `/forge-scripts`; a `structural` change will fail the run.
   - **Has an AIO key?** `/sync-cases` must re-run. List the keys.
   - **Has green-run or exploratory evidence?** An `expected-value` change makes it
     stale — say so, so it is re-run rather than trusted.
   - **`@visual` baseline affected?** It must be regenerated in the pinned
     container; a host-generated baseline is never acceptable.
7. **Verify, then report.** Every file parses · TC ids unique and none renumbered
   (diff the id set; show adds/retires as intentional) · each scenario still has a
   matching `@TC-` tag + title id, a description block, one scenario type, one
   QA-owned `@testtype:` · no locator entered a step · every AC still in a QA
   scenario or `dev-handoff.md` · **`git diff --stat features/<feature-slug>/`
   touches only the files the change list named** — anything else means the edit was
   too broad, so revert and narrow it.
8. **Write the amendment record** →
   `.probe/artifacts/<feature>/20-cases/amendments/<YYYY-MM-DD>-<n>.md`: trigger and
   source, the change list with each item's class, before/after per touched
   scenario, the invalidations, and who requested it. Append-only history — never
   edit or delete an earlier record.
9. Update the ledger row with final counts and the invalidations.

## Ledger amendment table

```markdown
## Case amendments

| Date       | Trigger (source) | TCs touched        | Classes        | Invalidates | Record                                       |
| ---------- | ---------------- | ------------------ | -------------- | ----------- | -------------------------------------------- |
| 2026-07-28 | Q-08 confirmed   | TC-…-088, TC-…-089 | expected-value | AIO re-sync | [2026-07-28-1](…/amendments/2026-07-28-1.md) |
```

Later gates read this table to check whether their evidence predates a change.

## Rules

- **Edit in place; never regenerate.** Rewriting a whole feature file is a
  redesign — stop and confirm that intent, because it renumbers ids and orphans
  AIO records.
- **Never silently drop a case.** Retire or supersede, with a reason.
- **Requirements are out of scope** — those go through `/probe-spec` first.
- **An unconfirmed recommendation is not an answer.** Replacing a `TODO(spec)`
  literal requires a durable record (the Decisions-recorded table, a dated human
  confirmation). A `Q-NN` still `open` cannot be adopted — that marker exists
  precisely so nothing downstream runs on a guess.
- **Report the blast radius honestly.** An amendment that invalidates a signed gate,
  a passing script, or existing run evidence must say so plainly. Leaving a stale
  green signature behind is worse than not amending.
