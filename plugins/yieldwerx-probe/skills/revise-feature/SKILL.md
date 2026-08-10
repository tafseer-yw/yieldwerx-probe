---
name: revise-feature
user-invocable: true
description: Use when behaviour that already exists must change — inventory the current behaviour and everything that depends on it before touching anything, keep compatibility unless a break is explicitly authorized, migrate stored data safely, and name every QA artifact the change invalidates. PROBE development track.
track: dev
safety: writes-code
produces: revised behaviour on branch feat/<feature-slug>; .probe/artifacts/<feature>/70-build/revision-report.md including the downstream-invalidation list
consumes: the current implementation and the active profile. A spec analysis and its reconciliation are optional enrichment, never required.
argument-hint: <feature-slug> -- <what must change> [--breaking-ok "<authorization>"] [--ac AC-NN]
graph:
  consumes: [code:service, code:frontend, profile:active, artifact:10-spec/spec-analysis.md?]
  produces: [artifact:70-build/revision-report.md, code:service, code:frontend, doc:openapi]
  delegates: [agent:requirement-clarifier, agent:build-verifier, agent:testability-scout]
  next: [skill:update-cases, skill:change-impact, skill:review-code, skill:ship-change]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent.

# Revise Feature

## Why

Changing working behaviour is more dangerous than adding new behaviour, because
something already depends on it — a caller, a stored row, a screen, and an
approved test case that asserts the old wording. Building a revision the same
way as a new feature is how a rename lands in the application and a hundred
scenarios start failing for a reason nobody wrote down.

## What

A behaviour change with its current state documented first, compatibility
preserved unless a break is explicitly authorized, stored data migrated, and an
explicit list of the QA artifacts the change invalidates.

## When

Use when behaviour that exists must work differently — a renamed label, a
changed default, a new required field, a different calculation, a removed
option. For genuinely new capability use `/build-feature`; for something that
is simply wrong use `/fix-defect`.

## Where

Application code in the consumer repository, on branch `feat/<feature-slug>`.
The revision report goes to the configured `70-build` artifact directory.

## How

Inventory the current behaviour and its dependents before changing anything,
change it compatibly by default, migrate what is stored, verify in an
exact-failure loop, and hand the QA track a precise invalidation list.

## Preconditions — refuse if any fails

1. The change is stated concretely. "Improve the policy screen" is refused;
   "Scope level must offer Test Program between Device and Lot" is accepted.
2. A change that removes or renames a public surface — a route, a field, an
   enum value, a visible label an approved case asserts — requires
   `--breaking-ok "<authorization>"` naming who authorized it. Without it:
   > "This change breaks an existing contract. Re-run with `--breaking-ok`
   > naming the person who authorized the break, or propose a compatible
   > alternative."
3. Unrelated working-tree changes are preserved, never reverted.

## Procedure

1. **Inventory the current behaviour — before any edit.** Read the code and
   record what it does today, with `file:line` citations: the exact values, the
   exact labels, the exact status codes, the defaults. This inventory is the
   before-half of the report and the only reliable source for step 2. Do not
   work from memory of how it "should" behave.
2. **Find everything that depends on it.** Search the repository for callers of
   the route, readers of the column, users of the constant, and consumers of the
   label. Then, **if a QA track is running here**, search its side too:
   `.feature` files, case-details literals, locator inventories, API recon
   evidence, and golden or fixture data. **List them; do not edit them.** Where
   there is no QA side, the dependent inventory is simply the code half, and the
   invalidation list in step 9 says so rather than being omitted.
3. **Clarify the target behaviour.** Delegate to the **requirement-clarifier**
   agent with the change request, the current-state inventory, and the
   requirement source. Its open questions are answered by a human before design,
   not resolved by whichever reading is easier to implement.
4. **Design the transition, not just the end state.** For every dependent found
   in step 2, decide and record: unchanged, adapted, or broken-with-authorization.
   Default to compatibility — add the new value beside the old, accept both
   spellings for a release, keep the old route responding while the new one
   takes over. A break with no authorization is not a design option.
5. **Migrate what is stored.** Data written under the old behaviour must still
   read correctly, or be migrated in the same change with a migration the
   repository's own conventions register. State explicitly what happens to rows
   that predate the change; "they will be fine" is not a statement.
6. **Implement.** Apply the design. Where a label, an enum, or a message
   changes, change it in every place it is produced — the served API document
   included — so the code and its contract never disagree.
7. **Re-check observability.** Delegate to the **testability-scout** agent over
   the touched files. A rename that turns a stable handle into a fragile one is
   a regression this step exists to catch.
8. **Verify — the exact-failure loop.** Delegate to the **build-verifier**
   agent. Failures return verbatim into the implementing step. Loop until green
   with no unmet obligations, or until blocked on a human decision.
9. **Report, and name what is now stale.** Write
   `70-build/revision-report.md`: the before and after behaviour with citations;
   the dependent inventory with each one's disposition; the migration and its
   effect on existing rows; the verification output; the authorization for any
   break. End with an explicit **downstream-invalidation list** — the exact
   `.feature` files, TC ids, locator entries, recon artifacts, and fixtures this
   change makes wrong, and the routing for each: `/update-cases` for cases,
   `/change-impact` for frontend-driven scope, `/api-recon` for a contract
   surface, `/ui-recon` for locators.

## Boundaries

- **Never edit the QA artifacts you invalidate.** Naming them precisely is this
  skill's deliverable; amending them is `/update-cases`' job, and doing it here
  would destroy the TC and AIO identity that skill exists to preserve.
- **Compatibility is the default and a break is an authorized exception.** The
  authorization goes in the report with the name of who gave it.
- **A behaviour change is not a requirement change.** If the requirement itself
  must move, route it to whoever owns it — `/probe-spec --reconcile` where a
  spec analysis is the requirement of record, and the requirement's own author
  otherwise. A revision that contradicts the requirement without reconciling
  leaves the two permanently disagreeing.
- **Never read a gate for permission.** This skill revises code; it does not
  consult gate state, ledger status, or an audit verdict, and it does not
  require the QA track to be running at all.
- **Never delete a test to make a revision pass.** A test that fails because
  behaviour deliberately changed is an entry on the invalidation list.
- Work on `feat/<feature-slug>`. Never commit to a deployment branch, and never
  migrate a shared environment's data.
