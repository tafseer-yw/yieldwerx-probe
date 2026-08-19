---
name: forge-migration
user-invocable: true
description: Use when a schema or data change must become a safe, reviewable database migration for the active stack — SQL Server changesets for the legacy platform, EF Core migrations for modern services, SQL files for the lab stack. Applies the hard-won rules that make migrations boring: never edit an applied migration, additive first, NOT NULL on populated tables in two steps, seeds idempotent, and a verification run before the change is called done. PROBE development track.
track: dev
safety: writes-code
produces: migration files in the stack's convention; .probe/artifacts/<feature>/70-build/migration-notes.md
consumes: 60-design/tech-design.md's data-model section when it exists, else the stated change; the active stack profile
argument-hint: <feature-slug or change description> [--stack <profile-name>] [--data-only]
graph:
  consumes: [artifact:60-design/tech-design.md?, profile:active, input:change-description]
  produces: [code:migrations, artifact:70-build/migration-notes.md]
  delegates: [agent:build-verifier]
  next: [skill:build-feature, skill:review-code]
  scope: [repo:*]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Migration Forge (dev track)

## Why

A schema change is the one part of a feature that cannot be reverted by
deploying yesterday's build — data written under the new shape is already
there. Migrations therefore get their own skill, their own review posture, and
a small set of rules that exist because someone, somewhere, rolled back a
deployment.

## What

Migration files in the active stack's own convention, plus
`migration-notes.md`: what changes, why it is safe on a populated database, the
rollback story, and the verification run's real output.

## When

Run when the tech design's data-model section calls for schema or seed
changes, or standalone for a data correction. Always before the code that
depends on the new shape is merged — schema before dependents.

## Where

Migration files where the stack keeps them (the profile's migration
conventions); notes under the feature's `70-build` artifact directory.

## How

Resolve the stack, draft the change under the safety rules below, register it
the way the stack requires, verify with the configured command, and record the
rollback story honestly — including when the honest story is "forward-only".

## The rules that make migrations boring

1. **Never edit an applied migration.** Once a migration has run anywhere
   beyond the author's machine, it is history; a correction is a new
   migration. (The Liquibase form of this rule is enforced by hook in the
   sibling org that taught it to us; here it is enforced by review.)
2. **Additive first.** Add the column, backfill, flip the readers, then — in a
   later migration, after the release proves out — drop the old shape.
   Rename = add + copy + drop across releases, never a single `RENAME` on a
   table something deployed still reads.
3. **NOT NULL on a populated table is two steps.** Add nullable + backfill;
   only then add the constraint. A single-step NOT NULL is a production
   incident on any table with rows.
4. **Seeds are idempotent.** Every data insert guards itself
   (`WHERE NOT EXISTS` or the stack's merge idiom); a seed that duplicates on
   re-run corrupts the data it was meant to provide. Multi-tenant seeds state
   explicitly whether they are default-only or per-tenant, and prove which
   tenants they touch.
5. **Audited tables move in pairs.** Where the stack keeps audit shadow tables,
   a column added to the entity is added to its audit twin in the same
   migration — a drifted audit table fails on the first write, in production.
6. **Stored-procedure changes are migrations too.** On the legacy stack
   (934+ procedures), an `ALTER PROCEDURE` ships as a migration with the same
   never-edit-applied rule, not as an out-of-band script someone runs.

## Procedure

1. **Resolve the stack** and read the profile's migration conventions;
   `TODO(repo)` items get confirmed against the repository first.
2. **Draft from the design's data-model section** (or the stated change),
   applying the rules above. Say in the notes which rules bit — "two-step NOT
   NULL because ORDERS is populated" is the review's fast path.
3. **Register** the migration the way the stack requires (changelog include,
   EF Core snapshot, sequential filename — the profile says which), and verify
   the registration is complete; an unregistered migration passes every local
   test and fails the deploy.
4. **Verify.** Run the configured `dbMigrate` /` dbMigrateVerify` commands
   against a local database; delegate wider checks to **build-verifier**.
   No configured command → the capability is reported unavailable and the
   close state is `BLOCKED`, never "should apply cleanly".
5. **Write `migration-notes.md`**: the change, the safety argument on a
   populated database, tenant scope where applicable, the rollback story
   (a real inverse, or explicitly forward-only with the recovery path), and
   the verification output verbatim.
6. **Close** in one D12 state.

## Boundaries

- Destructive statements (`DROP`, `DELETE`, `TRUNCATE`, narrowing casts) are
  named in the notes' first lines, with the proof the target is safe to lose.
- Never point a migration at a shared environment; local verification only,
  and deployment stays with the deployment process.
- A migration needed by a QA test-data seed belongs to `/test-data` design in
  the QA track; this skill owns product schema, not fixtures.
