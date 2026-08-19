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

## Upgrade from 3.0.x to 3.1.0

**Additive — no 3.0 behavior changed.** The new skills appear on install; the
one thing to decide is whether to route dev work by stack.

1. **Declare your stacks (optional but recommended for the Dev track).** Add a
   `stacks:` list to `probe.config.yaml` naming the profiles present in this
   consumer, first entry the default:

   ```yaml
   stacks: [node-ts-spa]        # or [dotnet-legacy], or several
   ```

   Dev-track skills accept `--stack <name>`; without the list they fall back to
   your existing `profile:` key. An unknown `--stack` fails closed.

2. **PRDs get a home and a lifecycle.** `/forge-prd` writes to `paths.prds`
   (falling back to `paths.requirements`) with `prd-draft.md` →
   `prd-in-review.md` → `prd-signed-off.md` — renamed, never copied. If you keep
   requirements in the knowledgebase, point `paths.prds` there; `/probe-spec`
   treats a signed-off PRD as its canonical source and records an unsigned one
   as a gap rather than refusing.

3. **Spec Probe is shared now.** Nothing to change: one `spec-analysis.md` per
   feature, dev and QA both read it, and a requirement change still goes through
   `/probe-spec --reconcile`. The ledger now records which track ran it.

4. **Desktop testing (if you use TestComplete).** Select the
   `testcomplete-winforms` profile and configure `commands.desktopTests` /
   `desktopTestsTagged`. Read the profile's CI document before wiring a runner —
   TestComplete needs an **interactive user session**, which a normal CI agent
   does not provide, and the exit-code contract is non-obvious (only exit 2 is a
   test failure).

5. **Security testing.** Configure the `commands.security*` keys for the tools
   you adopt (the adapter contract lists the verbs; the example playwright-bdd
   config shows illustrative wiring). Run `deps-scan`/`sast` freely; the active
   verbs (`api-scan`, `fuzz`, live `baseline-scan`) require explicit target
   authorization and refuse without it.

6. **Nothing is removed.** Every 3.0 skill, gate, and artifact behaves exactly
   as before.

## Upgrade from 2.13.x to 3.0.0

**Breaking.** Every gate becomes a record of a human decision, and the machinery
that existed to argue with computed verdicts is removed.

Removed entirely — three skills, one agent, one reference, two scripts:

| Removed                                | Replacement                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `/yw:audit-cases`                      | the Design Gate digest, the coverage report, and Case Forge's self-check |
| `/yw:bypass-gate`                      | nothing — there is no waiver to record                                  |
| `/yw:owner-bypass`                     | nothing — there is no override to authorize                             |
| `agents/test-case-auditor.md`          | —                                                                       |
| `references/governance/gate-hibernation.md` | `references/governance/human-gates.md`                             |
| `probe owner-bypass` CLI command       | —                                                                       |
| `governance.gates` in `probe.config.yaml` | —                                                                    |

Steps:

1. **Remove `governance.gates` from `probe.config.yaml`.** The key is no longer in
   the schema, and `probe validate-config` rejects it as unknown. Nothing replaces
   it: gates no longer block, so there is nothing to suspend.
2. **Drop `probe owner-bypass` from any consumer script or runbook.** Delete the
   `PROBE_OWNER_BYPASS_PIN` and signing-key entries from your `.env` — they
   authorize nothing now.
3. **Leave existing ledgers alone.** Do not rewrite history: old waiver,
   hibernation, and bypass rows stay exactly where they are, as the record of what
   was decided under the process in force at the time. Features started after
   3.0.0 use the new template.
4. **Add a Gate approvals table to any in-flight ledger** you want to keep moving:

   ```markdown
   ## Gate approvals (human decisions)

   | Gate | Scope | Approved by | Role | Timestamp | Confirmed | Evidence |
   | ---- | ----- | ----------- | ---- | --------- | --------- | -------- |
   ```

   `/sync-cases` and `/forge-scripts` read this table. For backwards
   compatibility they also accept a pre-3.0 stage-row Design Gate status of
   `approved`, `signed`, or `done` — a genuine human approval under the old model.
   They deliberately do **not** accept `bypassed`, `waived`, or `hibernated`: those
   mechanisms no longer exist, and honouring one would let a retired override
   authorize a live external write.
5. **Rename the per-category Design Gate table columns.** `Signed by` → `Approved
   by`, `Decision` + `Recorded by` → `Timestamp` + `Confirmed`. Drop the
   `Case Audit` column.
6. **Replace `/yw:audit-cases` in any runbook** with `/yw:gate-design`. The
   coverage arithmetic it used to check is in the `requirementsCoverage` report,
   which the Design Gate digest attaches; the adversarial reading is now the
   human's, and the digest is built for it.
7. **`/yw:audit-scripts` still exists but is advisory.** It holds no ledger row,
   gates nothing, and needs no waiver. `/yw:green-run` and `/yw:gate-merge` no
   longer require it. Keep running it — it catches self-passing tests — but run it
   because it is useful, not because something is blocked without it.
8. **Expect the `waived` ledger status to disappear.** The vocabulary is
   `pending · in-progress · done · blocked · n/a`.
9. **Case dispositions lose `waived`.** Use `manual-permanent`,
   `deferred-until:<condition/date>`, or `retired`.

Two other changes land in the same release:

- **Spec Probe enforces plain language.** `spec-analysis.md` gains a required
  `## Terms` section and a required `**In plain words:**` line per acceptance
  criterion, and the validator now rejects invented acronyms and shortened control
  labels. Bring an existing analysis forward with
  `/yw:probe-spec <feature> --migrate-format`, which adds both without changing
  any meaning or invalidating downstream evidence.
- **Case Forge designs API cases in every category.** Each category now records an
  explicit API disposition alongside its visual disposition, and API scenarios go
  to `features/<slug>/<category>-api.feature`. They remain repository-only — the
  AIO exclusion for `@api`, `@testtype:api`, `@testtype:contract`, and
  `@testtype:performance` is unchanged.

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

## Upgrade from 2.13.x to 2.13.2

Version 2.13.2 stops the plugin declaring a hard dependency on the
knowledgebase. Through 2.13.1 an unsatisfied dependency left Claude Code
disabling `yw` entirely, so every `/yw:*` command answered `Unknown command` on
any account without `yieldwerx-knowledgebase@yieldwerx-company` installed.

1. Update `yw@yieldwerx` and run `/reload-plugins`, then fully restart the app.
2. Confirm the plugin is no longer disabled. `claude plugin list` — or the
   `/plugin` Errors tab — must show no `dependency-unsatisfied` entry for
   `yw@yieldwerx`, and the Skills panel must list 34 `yw` skills.
3. Re-point the `yieldwerx-company` marketplace at its **public GitHub source**
   if yours still resolves to the internal Azure DevOps repository. Both publish
   the same marketplace name, so every `@yieldwerx-company` reference keeps
   working; only reachability differs.

   ```text
   /plugin marketplace remove yieldwerx-company
   /plugin marketplace add https://github.com/tafseer-yw/yieldwerx-knowledgebase.git
   ```

4. Install the knowledgebase only if you need product knowledge. It is now an
   optional prerequisite, not a dependency, and only `/yw:ask-yieldwerx` and
   `/yw:update-yieldwerx-knowledge` consult it.

   ```text
   /plugin install yieldwerx-knowledgebase@yieldwerx-company
   ```

5. Set `probeVersion: 2.13.2`.
