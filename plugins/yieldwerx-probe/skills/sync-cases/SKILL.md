---
name: sync-cases
user-invocable: true
description: Use when AIO-eligible non-API Gherkin scenarios authorized by a Design Gate approval or explicit allrounder bypass must be pushed to Jira AIO Tests. Excludes @api, @testtype:api, @testtype:contract, and @testtype:performance scenarios unconditionally. PROBE Case Sync stage.
track: design
safety: writes-shared
produces: AIO Tests cases (BDD/Gherkin) in the configured project, .probe/artifacts/<feature>/25-aio-sync/aio-sync.md, traceability write-backs (AIO key) in features/<feature>/*.feature
consumes: features/<feature-slug>/*.feature, config/aio-sync.json, docs/qa/<feature>/LEDGER.md
chains: /forge-cases, /gate-design
argument-hint: <feature-slug> [--live] [--category CAT-NN]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Case Sync (AIO Tests)

## Why

Keep approved manual test records and automation traceability synchronized
without mixing external-system writes into test-case design.

## What

Create or update one configured case-management record per approved,
AIO-eligible scenario and write stable external identifiers into traceability.
API and contract scenarios remain repository-only.

## When

Run after the Design Gate has a recorded human approval or explicit allrounder
bypass, and rerun after authorized scenarios change; use dry-run until a human
authorizes the exact live target set.

## Where

Read configured feature files and case-management settings, write sync evidence
to `25-aio-sync`, and optionally update AIO through the bundled adapter.

## How

Confirm connectivity, build an idempotent dry-run plan, validate a narrow
target when necessary, require explicit authorization for `--live`, preserve
manual records, and review all feature-file write-backs.

Push the feature's AIO-eligible Gherkin scenarios to **Jira AIO Tests** as BDD/Gherkin test
cases — the durable manual records automation later links its results to. The
engine is the consumer's configured `syncCases` command. The plugin includes
an optional AIO adapter under `${CLAUDE_PLUGIN_ROOT}/adapters/aio/`; consumers
may wrap that adapter or supply an equivalent compatible command. This skill
orchestrates it and keeps the ledger honest. **The record in AIO is authoritative** — later
Script Forge/TestOps link the automated scenario and results to the same case;
never delete or clone it merely because `@automated` was added.

## Why a dedicated stage (not the Atlassian MCP)

AIO Tests is a third-party Jira app with its **own REST API**; the native
Atlassian MCP cannot create AIO cases. So sync is REST-based (like
`bug:sync`), config-driven, and offline-capable — decoupled from `/forge-cases`
(which only designs the scenarios).

## Preconditions

- `/forge-cases` is `done` — `features/<feature-slug>/*.feature` exist, and every
  scenario carries a repository-local `@TC-<feature-slug>-NNN` identity tag or
  a verified pre-existing AIO identity such as `@YWPD-TC-1202`; that id also
  opens its title,
  plus a `# AC: AC-NN` comment. A scenario whose tag and title id disagree is a
  hard stop: fix it in `/update-cases` before syncing, or the AIO record binds to
  the wrong case.
- **Live push requires a recorded human Design Gate approval or explicit
  allrounder Design Gate bypass** for its scope. A whole-feature `--live`
  needs the feature decision. A scoped `--live --category CAT-NN` needs only
  that category's approved or bypassed row in the per-category table. A valid
  allrounder-only Claude transcription counts; an agent-authored decision does
  not. The script refuses `--live` otherwise. Dry-run is always allowed and
  needs no credentials.
- `config/aio-sync.json` conventions are filled (projectKey, folderTemplate,
  field defaults). The linked **requirement is derived from the PRD** per
  feature — use the requirement provenance carried by `spec-analysis.md` or the
  ledger; do not reopen the raw PRD. Fall back to the title/slug as a label only
  when the approved analysis records no Jira key (override with `requirementMap`). The secret token is in
  the environment (`AIO_API_TOKEN`, plus `AIO_EMAIL` for basic auth), loaded
  from a gitignored `.env` or the shell — **never in config or code**.

## Partial (per-category) sync

Categories can be designed, audited, approved, and synced independently, so team
members work different categories in parallel without waiting for the whole
feature. Pass `--category CAT-NN`:

- Scope narrows to scenarios whose `# AC:` ids fall in that category's AC set,
  read from the **ACs** column of the ledger's per-category Design Gate table.
- The live gate switches from the feature Design Gate to **that category's
  authorized row**. Accept `Decision = approved`, or `Decision = bypassed`
  with a named QA Lead/Automation Engineer and
  `Recorded by: Claude — transcribed from direct allrounder gate bypass`.
  Missing authorization fails closed and names the exact row.
- Evidence is written to a category-scoped plan
  (`25-aio-sync/aio-sync-<CAT>.md`) so parallel runs never clobber each other.
- Scoped sync is always a SUBSET: it advances only the named category and never
  by itself completes the feature's Case Sync stage. Record it in the ledger as
  `Case Sync (CAT-NN): done`.

## Procedure

1. Mark Case Sync `in-progress` in the ledger.
2. **Confirm connectivity:** run the configured AIO connectivity command. It validates that your
   PERSONAL `AIO_API_TOKEN` (in your own gitignored `.env` — each user sets
   their own; generate it in AIO → gear → My Settings → API Token)
   authenticates against the configured project. Green ✓ before proceeding; the
   live sync runs the same probe automatically and refuses on failure.
3. **Dry run:** run configured `syncCases` for `<feature-slug>` without its
   live-write flag. Review the plan
   (`.probe/artifacts/<feature>/25-aio-sync/aio-sync.md`): create vs update
   counts, API/contract exclusions, folder, linked requirement, and per-scenario tags. Fix any gaps —
   an unmapped requirement (`requirementMap`), a placeholder projectKey, or a
   scenario missing a TC id — before going live.
4. **Validate the payload once (first live use):** the exact AIO create/update
   field names are marked `TODO(env)` in `buildCasePayload`. Push a SINGLE
   scenario with configured `syncCases` plus `--case <TC-id> --validate` — this is a real
   external write and requires explicit human authorization plus an identified
   disposable validation target. It may bypass gate approval only for that target,
   emits a loud warning, and pushes exactly that case. Confirm it lands correctly in
   AIO (folder, BDD steps, requirement link, tags), reconciling against the AIO
   Swagger (`https://tcms.aiojiraapps.com`); correct the payload builder if
   needed before the bulk push.
5. After a human reviews and approves the dry-run target set, **live sync** with
   configured `syncCases` plus its explicit `--live` flag. The adapter
   creates cases without a real AIO key and updates those that already carry
   one (idempotent), then **writes the returned AIO key back as an additional
   scenario tag** (e.g. `@YWPD-TC-1202`), appended after the local
   `@TC-<feature-slug>-NNN` tag. An imported case already using that verified
   AIO id as its primary identity is updated in place and does not receive a
   fabricated local id.
   **Never** rewrite the scenario title, never remove or renumber the local TC
   tag, and never touch the step body — the local id is the join key every other
   stage and `coverage:req` rely on, and the title is what the QA reads. A
   re-sync updates the existing AIO key tag in place rather than appending a
   second one.
6. **Review the write-backs** (`git diff features/`) before committing — the diff
   should show _only_ added/updated AIO key tags. Any change to a title, a step,
   or a local TC id means the write-back is wrong; revert and fix the script.
7. On partial failure, record every successful remote key and failed TC id;
   resume from that manifest without recreating successful cases. Refuse an AIO
   key already owned by another TC id and require reconciliation.
8. Update the ledger: Case Sync `done` (or `blocked` if credentials/approval
   were unavailable), the create/update counts, and `AIO synced: yes/pending`.
   Re-run this stage whenever scenarios change; it updates in place.

## Read-only explorers

- configured `aioCheck` — token + project connectivity (also the live pre-flight).
- configured `aioWhoami` — access context (base, project, Jira id, permission).
- configured `aioFolders` — the existing folder tree (confirm the target).
- configured `aioCases` — cases already in a folder (dedup check
  before syncing; a bare name lists candidate folders when ambiguous).

## Quality bar (gates verify these)

- Every scenario has a resolvable `TC-…` and `AC-NN`; unmapped/unknown ACs are
  a Case-Audit finding, not something to paper over here.
- One AIO case per eligible non-API scenario, Script Type = BDD/Gherkin, in the configured
  folder, linked to the feature's Jira requirement.
- `@api`, `@testtype:api`, `@testtype:contract`, and `@testtype:performance` scenarios are excluded
  before create/update, `--validate`, folder writes, and key write-back. The
  plan lists each exclusion; `--live` cannot override it.
- Each eligible scenario's `@testtype:<level>` tag (the Case-Forge test-type
  classification) is pushed to the AIO case **Labels** field; the dry-run plan's
  `Labels` column shows exactly what will be set. A scenario missing a
  `@testtype:` tag is a Case-Forge/Case-Audit gap, not something to invent here.
- Idempotent: a second run updates existing cases (matched by the written-back
  AIO key), never duplicates. The original manual record + status is retained
  when automation is later linked.
- Secrets only in env; live is dry-run-by-default + explicit `--live`, and
  fails closed on partial config, non-HTTPS base, or missing recorded human
  approval/allrounder gate bypass for the sync's scope.
- Every live create/update requires explicit authorization for the reviewed
  target set. Connectivity and dry-run checks remain read-only.
