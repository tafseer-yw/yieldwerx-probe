# Extraction record

PROBE v1.4 was extracted on 2026-07-29 from the
`test-ops/test-automation/boilerplate-e2e` working tree.

## Included

- All 19 PROBE workflow skills.
- Ten operational agents used by those workflows.
- PROBE process authority, playbook and quick reference.
- Automation prioritization and external-requirement governance references.
- Procedural Gherkin lint and requirements-coverage generators.
- Optional Playwright BDD rules/docs and AIO adapter source.

## Deliberately excluded

- Feature files, test scripts, page objects, fixtures and test data.
- Per-feature ledgers, gate reports and `.probe` evidence.
- Demo applications and generated baselines.
- `probe-academy-maintainer`, which owns the source framework's documentation
  portal rather than a PROBE workflow.
- YieldWerx product/domain knowledge. That belongs in the separate,
  versioned `yieldwerx-knowledgebase`.
- Framework bug-sync and UI-impact executables whose imports are still tied to
  the source application. Their skills use configured consumer commands.
- Copied Gherkin lint, requirements-coverage, and AIO scripts. Version 1.6
  publishes these capabilities through `@yieldwerx/probe-cli`.

The source framework copy remains in place for a dual-run compatibility period.

## Upgrade from 2.9.0 to 2.9.1

Version 2.9.1 repairs AIO live-sync integrity. Existing cases and artifacts do
not require migration.

1. Set `probeVersion: 2.9.1` and refresh the `yw@yieldwerx` plugin pin.
2. Run `probe doctor` and the consumer's normal validation commands.
3. Run Case Sync in dry-run mode and confirm the planned Tags and Labels for a
   small approved scope.
4. Validate one explicitly authorized case with the live AIO API before a bulk
   push because field acceptance can vary by AIO project/version.
5. Confirm retired scenarios are reported as excluded and never update their
   retained AIO records.

## Upgrade from 2.8.0 to 2.9.0

Version 2.9 adds Playwright MCP-assisted case execution and explicit skill
composition. Existing artifacts and cases require no migration.

1. Set `probeVersion: 2.9.0` and refresh the `yw@yieldwerx` plugin pin.
2. Run `probe doctor` and the consumer's normal validation commands.
3. Use `/yw:execute-cases <feature> <env>` for an execution-only browser batch.
4. Use `/yw:ui-recon ... --with-case-execution` when UI Recon and case
   execution should share one browser walk. Add `--with-api-recon --spec ...`
   when the same actions should also produce reconciled API evidence.
5. Keep independent cases isolated even though the browser connection remains
   open. Reuse authentication only inside the same authorized role and tenant.
6. Route intermittent evidence to `/yw:flake-triage`, supported application
   defects to `/yw:bug-report`, and consolidate results with
   `/yw:log-exploratory`.
7. Review [the skill usage and tandem guide](docs/SKILL-USAGE.md) for every
   accepted argument and composition boundary.

## Upgrade from 2.7.1 to 2.8.0

Version 2.8 adds first-class API discovery, API automation, and k6 performance
workflows.

1. Set `probeVersion: 2.8.0` and refresh the `yw@yieldwerx` plugin pin.
2. Run `probe doctor` and the repository's lint, typecheck, generation, API,
   and performance-smoke validation commands.
3. Run `/yw:api-recon` before creating API or performance automation from
   Swagger/OpenAPI or observed traffic.
4. Use `/yw:forge-api-tests` for functional, contract, workflow,
   security-baseline, and deterministic resiliency coverage.
5. Use `/yw:forge-performance-tests` for k6 workloads; keep their Gherkin as
   business-level design records rather than Playwright bindings.
6. Confirm API/contract/performance scenarios are reported as repository-only
   and excluded from every AIO create/update/result path.

## Upgrade from 1.4.x to 1.5.0

Spec analysis now uses a stable AC index plus one Workflow or Simple Rule
definition for every active AC. The 1.5 validator does not accept the old
one-line AC table as a completed Spec Probe artifact.

For an active feature:

1. Rerun Spec Probe with the approved source.
2. Keep every existing `AC-NN` when its meaning has not changed.
3. Convert action/result requirements to Workflow Given/When/Then.
4. Convert limits, layout, allowed values, data rules, calculations, and
   measurable non-functional requirements to Simple Rule checklists.
5. Review the old and new meaning before moving the ledger back to `done`.
6. If the change only makes the same requirement clearer, record a format-only
   migration. If an AC is split or its meaning changes, use Update Cases and
   reopen the affected audit/gate evidence.

## Upgrade from 1.5.x to 1.6.0

Version 1.6 makes external integrations deterministic.

1. Install and enable both `yieldwerx-probe@yieldwerx` and
   `yieldwerx-knowledgebase@yieldwerx-company` at project scope.
2. Set `probeVersion: 1.6.0`.
3. Configure `integrations.knowledge` using
   `examples/playwright-bdd/probe.config.yaml`.
4. Run `probe doctor` and resolve every error.
5. Replace copied linter, coverage, and AIO source files with
   `@yieldwerx/probe-cli` commands after the CLI package is installed.
6. Dual-run one feature before deleting local skill and agent copies.
7. Keep consumer-owned path-scoped rules; they remain framework configuration,
   not PROBE process ownership.

## Upgrade from 1.6.x to 2.0.0

Version 2 shortens the public Claude plugin namespace.

1. Make sure both the `yieldwerx` and `yieldwerx-company` marketplaces are
   configured.
2. Install or update `yw@yieldwerx`. On Claude Code 2.1.193 or newer, the
   marketplace rename map can migrate editable `yieldwerx-probe` settings.
3. Replace `/yieldwerx-probe:<skill>` with `/yw:<skill>`.
4. Use `/yw:ask-yieldwerx` and `/yw:update-yieldwerx-knowledge` for public
   knowledge commands.
5. Keep `yieldwerx-knowledgebase@yieldwerx-company` available as the
   independently released knowledge dependency.
6. Set `probeVersion: 2.0.0` and run `probe doctor`.

## Upgrade from 2.0.x to 2.1.0

Version 2.1 makes visual-regression selection and scripting explicit.

1. Set `probeVersion: 2.1.0`.
2. For every category designed by Case Forge, add to
   `20-cases/coverage-notes.md` either
   `Visual candidates: <TC ids or planned behaviors>` or
   `Visual: N/A — <specific reason>`.
3. Replace a generic cross-category deferral with the target `CAT-NN` and the
   exact rendering behavior it will cover.
4. Rerun Case Audit. Missing or unsupported visual dispositions are `high`.
5. For approved `@visual` automation, confirm the active profile supplies a
   named baseline, approved masks, deterministic runner, update/comparison
   commands, and expected/actual/diff evidence before adding `@automated`.
6. Run `probe doctor` and the repository's normal quality checks.

## Upgrade from 2.1.x to 2.2.0

Version 2.2 gives every acceptance criterion the same readable structure.

1. Set `probeVersion: 2.2.0`.
2. Keep each existing `AC-NN` when its meaning has not changed.
3. Add `**Summary:** Verify that ...` before every active AC definition.
4. Keep Workflow ACs in Given/When/Then.
5. Convert Simple Rule checklists to Given/When/Then. Use only the context and
   action supported by the requirement. Write each `Then` or result `And` with
   `must` or `must not`.
6. Treat this as a format-only migration when the requirement meaning stays
   the same. Reopen cases and gate evidence only if the meaning changes.
7. Run the Spec Probe validator, `probe doctor`, and the repository's normal
   quality checks.

## Upgrade from 2.2.x to 2.3.0

Version 2.3 makes every update to an existing spec analysis explicit.

1. Set `probeVersion: 2.3.0`.
2. Do not rerun Spec Probe without a mode when `spec-analysis.md` already
   exists.
3. To change only the AC presentation, run
   `/yw:probe-spec <feature-slug> --migrate-format`.
4. To compare the old analysis with a complete approved source, run
   `/yw:probe-spec <feature-slug> <spec> --reconcile`.
5. Review `10-spec/spec-reconciliation.md`. Confirm that every unchanged item
   kept its ID and every meaning change uses old → new IDs.
6. For substantive changes, run `/yw:update-cases` for the named ACs, then
   complete the listed audit, gate, script, evidence, and sync actions.
7. Run both Spec Probe validators, `probe doctor`, and the repository's normal
   quality checks.

## Upgrade from 2.6.x to 2.7.0

Version 2.7 lets a named QA Lead or Automation Engineer explicitly bypass any
formal PROBE gate without presenting failed or missing evidence as passed.

1. Set `probeVersion: 2.7.0`.
2. Update or reinstall the `yw` plugin.
3. Use `/yw:bypass-gate <feature> <design|merge|ops|all>`. A bare `approved`,
   `continue`, or `go ahead` does not create a bypass.
4. Keep the gate report's real evidence verdict and record the human decision
   separately as `Decision: bypassed` and
   `waived — allrounder gate bypass`.
5. For `all`, verify that the ledger contains separate Design, Merge, and Ops
   waiver rows.
6. Confirm downstream skills accept only the exact bypassed scope. A Merge
   Gate bypass does not merge a branch, and a gate bypass does not waive a
   stage/audit unless that item has its own waiver.
7. Run `probe doctor`, `npm test`, and the plugin validator.

## Upgrade from 2.5.x to 2.6.0

Version 2.6 adds explicit Case Audit bypass and the PIN-protected PROBE Owner
override.

1. Set `probeVersion: 2.6.0`.
2. Update or reinstall the `yw` plugin.
3. Keep normal Case Audit as the default. When a named QA Lead or Automation
   Engineer explicitly bypasses it, record the exact scope, reason, known gap,
   residual risk, identity, role, date, and direct-session authorization.
4. If Tafseer Haider needs a broader override, set a private 6–12 digit
   PIN by running `probe owner-bypass setup`; the command also generates a
   high-entropy signing key and stores both only in gitignored `.env`.
5. Tafseer runs `probe owner-bypass authorize` himself and gives Claude only
   the receipt path. Never send or store the PIN in chat or a committed file.
6. Run `probe doctor`, `npm test`, and a non-secret owner-bypass receipt test
   before adopting the release.

## Upgrade from 2.5.0 to 2.5.1

Version 2.5.1 removes the API-token suffix from the read-only AIO access
summary.

1. Set `probeVersion: 2.5.1`.
2. Update or reinstall the `yw` plugin.
3. Run `probe --version` and `probe doctor`.
4. Run the configured `aioWhoami` command and confirm it says only that the
   token was loaded; no token characters should appear.

## Upgrade from 2.4.x to 2.5.0

Version 2.5 simplifies Design Gate approval for allrounders only.

1. Set `probeVersion: 2.5.0`.
2. Keep the Design Gate report and ledger approval block in the new format:
   approved by, role, date, decision, recording method, approval evidence, and
   confirmed `@auto:now` set.
3. A named QA Lead or Automation Engineer may directly tell Claude `approved`
   after the gate is `READY FOR APPROVAL`.
4. Claude then fills both artifacts, dates them, marks Design Gate `done`, and
   writes the standard solo-allrounder waiver. The allrounder does not edit the
   files manually.
5. Do not apply this shortcut to a Domain Test Analyst, another role, an
   unknown speaker, or a `NOT READY` gate. Merge and Ops Gate signing do not
   change.

## Upgrade from 2.3.x to 2.4.0

Version 2.4 separates requirement authority from knowledge context.

1. Set `probeVersion: 2.4.0`.
2. In `Sources and revisions`, name the supplied PRD/story/specification under
   `Requirement source of truth`.
3. Record knowledgebase chapters under `Reference context consulted`, clearly
   labeled as context only.
4. Check every `AC`, `AMB`, and `OOS` Source cell. It must cite the provided
   requirement's section/page, not the knowledgebase, handbook, domain map, or
   observed implementation.
5. If an active AC was created or completed from knowledge context, run
   `/yw:probe-spec <feature> <approved-requirement> --reconcile`. Keep it only
   when the provided requirement supports it; otherwise route it to a question,
   consideration, removal, or supersession as appropriate.
6. Treat source-authority corrections as substantive when they change
   requirement meaning or coverage; route affected cases through
   `/yw:update-cases`.
7. Run both Spec Probe validators, `probe doctor`, and the repository's normal
   quality checks.
