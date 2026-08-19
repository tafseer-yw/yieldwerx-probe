---
name: sync-cases
user-invocable: true
description: Use when AIO-eligible non-API Gherkin scenarios authorized by a recorded human Design Gate approval must be pushed to Jira AIO Tests. Excludes @api, @testtype:api, @testtype:contract, and @testtype:performance scenarios unconditionally. PROBE Case Sync stage.
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

Run after the Design Gate has a recorded human approval, and rerun after
authorized scenarios change; use dry-run until a human authorizes the exact live
target set.

## Where

Read configured feature files and case-management settings, write sync evidence
to `25-aio-sync`, and optionally update AIO through the bundled adapter.

## How

Select an engine for this host, confirm connectivity, build an idempotent plan,
validate a narrow target when necessary, require explicit authorization for the
live push, preserve manual records, and review all feature-file write-backs.

Push the feature's AIO-eligible Gherkin scenarios to **Jira AIO Tests** as
BDD/Gherkin test cases — the durable manual records automation later links its
results to. **The record in AIO is authoritative** — later Script Forge/TestOps
link the automated scenario and results to the same case; never delete or clone it
merely because `@automated` was added.

## Why a dedicated stage (not the Atlassian MCP)

AIO Tests is a third-party Jira app with its **own REST API**; the native
Atlassian MCP cannot create AIO cases. So sync is REST-based (like
`bug:sync`), config-driven, and offline-capable — decoupled from `/forge-cases`
(which only designs the scenarios).

## Step 0 — pick an engine for this host

**This skill is defined against verbs, not commands.** It used to be defined as a
shell command, which meant it had no engine at all in a host that gives the
assistant no shell — it simply failed there. Probe the host once, before anything
else, and say which engine you selected:

1. **CLI** — a shell is available and the configured `syncCases` command (or the
   bundled `probe aio` CLI) resolves. The default.
2. **MCP** — the `aio_check` / `aio_plan` / `aio_sync` tools are present. The
   plugin ships that server and declares it in its manifest, so it is available
   wherever the plugin is installed and the host supports plugin MCP servers.
3. **Export bundle** — neither. Produce the plan plus an importable bundle and the
   exact tag edits a later run will apply, then stop.

The six verbs are `check · explore · plan · authorize · push · write back`. The
procedure below uses those names; the engine decides how each is performed.
Authority, including what the export bundle contains and how to add a fourth
engine: [case-management.md](${CLAUDE_PLUGIN_ROOT}/references/integrations/case-management.md).

**Never silently degrade.** If the CLI engine was expected and is missing, say so
before falling back — a quiet fallback to an export bundle looks exactly like a
sync that worked. When the export bundle is all that is possible, record Case Sync
as `blocked — no sync engine available` with the bundle linked, and never as
`done`.

Two properties hold whichever engine runs:

- **`plan` needs no credentials and writes nothing.** It is always allowed.
- **`push` requires both** an explicit live instruction **and** a recorded human
  Design Gate approval for the exact scope. On the MCP engine the Bash guard that
  normally asks before a live write cannot fire, so `aio_sync` carries its own
  `confirm: true` and the adapter beneath it still checks the ledger. Neither
  substitutes for the other.

## Preconditions

- `/forge-cases` is `done` — `features/<feature-slug>/*.feature` exist, and every
  scenario carries a repository-local `@TC-<feature-slug>-NNN` identity tag or
  a verified pre-existing AIO identity such as `@YWPD-TC-1202`; that id also
  opens its title,
  plus a `# AC: AC-NN` comment. A scenario whose tag and title id disagree is a
  hard stop: fix it in `/update-cases` before syncing, or the AIO record binds to
  the wrong case.
- **Live push requires a recorded human Design Gate approval** for its scope.
  Read the ledger's **Gate approvals** table: a whole-feature `--live` needs the
  feature row; a scoped `--live --category CAT-NN` needs only that category's row
  in the per-category table. Each must name a human, a role, and a timestamp.
  That is the whole check. Authority:
  `${CLAUDE_PLUGIN_ROOT}/references/governance/human-gates.md`. The adapter
  refuses `--live` otherwise. Dry-run is always allowed and needs no credentials.
- `config/aio-sync.json` conventions are filled (projectKey, folderTemplate,
  field defaults). The linked **requirement is derived from the PRD** per
  feature — use the requirement provenance carried by `spec-analysis.md` or the
  ledger; do not reopen the raw PRD. Fall back to the title/slug as a label only
  when the approved analysis records no Jira key (override with `requirementMap`). The secret token is in
  the environment (`AIO_API_TOKEN`, plus `AIO_EMAIL` for basic auth), loaded
  from a gitignored `.env` or the shell — **never in config or code**.

## Partial (per-category) sync

Categories can be designed, approved, and synced independently, so team
members work different categories in parallel without waiting for the whole
feature. Pass `--category CAT-NN`:

- Scope narrows to scenarios whose `# AC:` ids fall in that category's AC set,
  read from the **ACs** column of the ledger's per-category Design Gate table.
- The live check switches from the feature Design Gate row to **that category's
  approval row**: a named human, a role, and a timestamp. Missing authorization
  fails closed and names the exact row.
- Evidence is written to a category-scoped plan
  (`25-aio-sync/aio-sync-<CAT>.md`) so parallel runs never clobber each other.
- Scoped sync is always a SUBSET: it advances only the named category and never
  by itself completes the feature's Case Sync stage. Record it in the ledger as
  `Case Sync (CAT-NN): done`.

## Procedure

1. Select the engine (step 0) and mark Case Sync `in-progress` in the ledger,
   recording which engine this run is using.
2. **`check` — confirm connectivity:** CLI `aioCheck`, or the `aio_check` tool. It validates that your
   PERSONAL `AIO_API_TOKEN` (in your own gitignored `.env` — each user sets
   their own; generate it in AIO → gear → My Settings → API Token)
   authenticates against the configured project. Green ✓ before proceeding; the
   live sync runs the same probe automatically and refuses on failure.
3. **`plan` — dry run:** CLI `syncCases` without its live-write flag, or the
   `aio_plan` tool. Review the plan
   (`.probe/artifacts/<feature>/25-aio-sync/aio-sync.md`): create vs update
   counts, API/contract exclusions, folder, linked requirement, and per-scenario tags. Fix any gaps —
   an unmapped requirement (`requirementMap`), a placeholder projectKey, or a
   scenario missing a TC id — before going live.
4. **Validate the payload once (first live use):** the exact AIO create/update
   field names are marked `TODO(env)` in `buildCasePayload`. Push a SINGLE
   scenario with `--case <TC-id> --validate` — this is a real
   external write and requires explicit human authorization plus an identified
   disposable validation target. It is exempt from the approval check for that one
   target only, emits a loud warning, and pushes exactly that case. Confirm it lands correctly in
   AIO (folder, BDD steps, requirement link, tags), reconciling against the AIO
   Swagger (`https://tcms.aiojiraapps.com`); correct the payload builder if
   needed before the bulk push.
5. **`authorize` then `push`.** After a human reviews the plan and approves the
   target set, run the live sync — CLI `syncCases --live`, or `aio_sync` with
   `confirm: true`. The adapter
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
6. **`write back`, then review it** (`git diff features/`) before committing — the diff
   should show _only_ added/updated AIO key tags. Any change to a title, a step,
   or a local TC id means the write-back is wrong; revert and fix the script.
7. On partial failure, record every successful remote key and failed TC id;
   resume from that manifest without recreating successful cases. Refuse an AIO
   key already owned by another TC id and require reconciliation.
8. Update the ledger: Case Sync `done` (or `blocked` if credentials/approval
   were unavailable), the create/update counts, and `AIO synced: yes/pending`.
   Re-run this stage whenever scenarios change; it updates in place.

## Read-only explorers (`explore`)

| Purpose                                                      | CLI            | MCP tool       |
| ------------------------------------------------------------ | -------------- | -------------- |
| Token + project connectivity (also the live pre-flight)      | `aioCheck`     | `aio_check`    |
| Access context: base, project, Jira id, permission           | `aioWhoami`    | `aio_whoami`   |
| The existing folder tree — confirm the target                | `aioFolders`   | `aio_folders`  |
| Cases already in a folder — the duplicate check before syncing | `aioCases`   | `aio_cases`    |

A bare folder name lists candidate folders when ambiguous. None of these writes
anything.

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
- Secrets only in env or a gitignored `.env` — never in configuration, code, a
  plugin manifest, or chat. Live is dry-run-by-default plus an explicit live
  instruction, and fails closed on partial config, a non-HTTPS base, or a missing
  recorded human approval for the sync's scope.
- The selected engine is recorded in the ledger and the sync evidence. An export
  bundle is never recorded as a completed sync.
- Every live create/update requires explicit authorization for the reviewed
  target set. Connectivity and dry-run checks remain read-only.
