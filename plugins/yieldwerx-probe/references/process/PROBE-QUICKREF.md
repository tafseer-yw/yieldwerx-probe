# PROBE Quick Reference

One page. Full authority: [PROBE-PROCESS.md](PROBE-PROCESS.md) ·
Copy-paste prompts for every step: [PROBE-PLAYBOOK.md](PROBE-PLAYBOOK.md).

## Starting a new feature (the card)

```
 1. /probe-spec <feature-slug> <spec>     → spec-analysis + LEDGER created
 2. Answer the open questions it raised   (product / dev / Domain Test Analyst)
 3. /probe-implementation <feature-slug> <env>  → optional: approved ACs vs running build
                                                    (or add --compare-implementation <env>
                                                     to /probe-spec to chain it)
 4. /forge-cases <feature-slug> [selector]→ plain-language procedural Gherkin per category
                                            (permanent @manual), + pacing/candidacy plan
                                            + visual candidate or specific N/A per category
 5. /audit-cases <feature-slug> [selector]→ adversarial review (default)
                                            or named allrounder explicitly records
                                            a Case Audit bypass + residual risk
 6. /gate-design <feature-slug>           → evidence report
    ✍  Domain Test Analyst signs manually, or a named allrounder says "approved"
       and Claude records the decision, date, @auto:now set, status, and waiver
       A bare "approved" never silently bypasses Case Audit
       A named allrounder may explicitly say "bypass Design Gate" even when
       NOT READY; Claude records the real gaps and gate waiver
 7. /sync-cases <feature-slug> [--live]   → push approved scenarios to Jira AIO Tests as BDD
                                            cases; stable AIO keys written back (dry-run default)
 8. /ui-recon <feature-slug> [env]        → locators + optional API/execution tandem
      [--with-api-recon --spec <openapi>]
      [--with-case-execution --tc <ids> --role <role>]
    /execute-cases <feature-slug> [env]   → one MCP browser batch, isolated
                                            cases, step results + failure evidence
    /log-exploratory <feature-slug>       → exploratory sessions + manual runs
                                            of Design-Gate-authorized cases
                                            (or signed risk acceptance)
 9. /forge-scripts <feature-slug> [selector]→ add @automated when runnable; retain @manual
                                            and @visual; use the profile's named baseline,
                                            masks, deterministic runner, and comparison evidence
                                            (refuses without recorded Design Gate approval
                                             or exact allrounder gate bypass)
10. /audit-scripts <feature-slug> [selector]→ adversarial code review (rework Script Forge if FAIL)
11. /green-run <feature-slug> [selector]  → green ×3 consecutive, every run logged
12. /gate-merge <feature-slug>            → evidence report incl. testId coverage
    ✍  Any allrounder signs or explicitly bypasses Merge Gate
       (the branch still uses normal merge authorization/protection)
13. /testops-promote <feature-slug>       → one CI run, fail-on-flake, Allure + durable PROBE evidence
14. /gate-ops <feature-slug>              → CI green ×5, flake <2%, AIO synced,
                                            exact manual-only count = 0
    ✍  Any allrounder signs Ops Gate → automation DONE
       or explicitly bypasses it → DONE — OPS GATE BYPASSED
```

Any named QA Lead or Automation Engineer may run
`/bypass-gate <feature> <design|merge|ops|all>`. `all` means the three
feature-wide gates and expands to separate Design, Merge, and Ops waiver
records. Category scope is supported only for Design. `bypass everything` is
rejected as ambiguous. The evidence remains READY, NOT READY, or not
assembled; a bypass is never shown as approved or passed.

PROBE Owner Tafseer Haider (`tafseer.haider@yieldwerx.com`) may waive any exact
PROBE item with `/owner-bypass`. The PIN and generated signing key stay in the
user's environment or gitignored `.env`; the PIN is entered only through the
hidden local CLI prompt. Claude sees only a short-lived, signed,
scope-specific receipt.

Spec Probe starts every active AC with `**Summary:** Verify that ...`. Both
Workflow and Simple Rule ACs use `Given/When/Then`. Workflow covers actions and
state changes. Simple Rule covers limits, layout, data, calculations, and
measurable non-functional rules; its results use `must` or `must not`. Case
Forge adds the detailed manual steps later.

Requirement authority: the provided PRD/story/spec only. The knowledgebase is
reference context for YieldWerx terminology and business understanding; it
cannot add requirements or fill PRD gaps. `AC`, `AMB`, and `OOS` sources cite
the provided requirement, never the knowledgebase or current implementation.

For an existing analysis, do not rerun Spec Probe without a mode:

```text
/probe-spec <feature-slug> --migrate-format
  → presentation only; IDs, meaning, evidence, and signatures stay unchanged

/probe-spec <feature-slug> <complete-approved-spec> --reconcile
  → compare old analysis with source; report changes and downstream actions
```

Both modes write `10-spec/spec-reconciliation.md`. Substantive changes go to
`/update-cases`; Spec Probe does not rewrite existing cases.

Use `/execute-cases <feature> <env> --continue-on-failure` only when the batch
can restore a verified known state after each captured failure. Reuse the MCP
connection, not mutated case state.

Anywhere along the way: `/bug-report` for app defects (wrong wafer data =
blocker, always) · `/flake-triage` for intermittent failures (`@quarantine`
within 24h; exit only with green ×5).

`[selector]` is one or more of `--scenario-type
positive|functional|negative|edge|all`, `--category CAT-NN`, `--ac AC-NN`, or
`--tc <TC-id>` where applicable. Selectors intersect and fail closed on zero
matches. Scoped results are labeled `SUBSET PASS/FAIL`; only a complete run can
finish a feature-level stage or gate.

Feature files are the manual test record: objective + visible procedural
actions and verifications. Keep oracle/fixture/locator/testId/DOM/render-sync
language in case details and code. Check with the configured `lintCases`
command.

Implementation Probe compares intended behavior with observed behavior. It
never rewrites an AC from the application, and it is not UI Recon: the former
finds requirement/build mismatches before case design; the latter harvests
locators and `data-testid` gaps after the Design Gate.

## Where things live

| What                                            | Where                                              |
| ----------------------------------------------- | -------------------------------------------------- |
| Feature status (glance view)                    | `docs/qa/<feature>/LEDGER.md`                      |
| Working/run artifacts (gitignored; CI-archived) | `.probe/artifacts/<feature>/<NN-stage>/`           |
| Signed gate reports (committed)                 | `docs/qa/<feature>/audit/gate-*.md`                |
| Conventions                                     | `CLAUDE.md` · locator policy, chart contract, tags |

## Severity ladder

|                |                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `blocker`      | wrong data on a chart/DB/export · self-passing test · falsified evidence — halts unless exactly waived by an authorized human |
| `high`         | raw CSS/XPath · hard wait · missing render sync · single-layer P1 · traceability break — gate NOT READY                       |
| `medium`       | convention drift — signer judges                                                                                              |
| `low` / `info` | style · observations                                                                                                          |

## Typical sessions by role

**QA Lead (allrounder)** — kicks off features (`/probe-spec`), signs or
explicitly bypasses any gate,
arbitrates waiver decisions, owns the flake log. For a ready Design Gate, the
QA Lead may say `approved` and let Claude record the decision and date. Typical
day: review a gate report, approve or bounce it with the checklist line that failed, run
`/flake-triage` on last night's CI, decide one quarantine exit.

Any named QA Lead or Automation Engineer may explicitly bypass Case Audit or
any Design/Merge/Ops Gate for an exact feature/category and accept its recorded
residual risk. Tafseer Haider is also the PROBE Owner and may use a
PIN-authorized `/owner-bypass` receipt for any other exact PROBE item.

**Automation Engineer (allrounder)** — drives the scripting track:
`/forge-scripts` → `/audit-scripts` → `/green-run` → `/gate-merge`, fixing
rework findings between runs. Signs any gate; records a waiver when signing
what would normally be the Domain Test Analyst's line.

**Domain Test Analyst** — owns test design quality: reviews
`spec-analysis.md` ambiguities, refines `/forge-cases` output with domain
knowledge (bin semantics, cluster/ink rules, notch conventions), **signs the
Design Gate**. Growth path into scripting: starts by fixing `low/medium`
script-audit findings on a branch, graduating to `/forge-scripts` under Merge Gate
review.

**Manual QA Engineer** — drives `/forge-cases` case drafting with the
designer agent, then owns human execution: runs the Design-Gate-authorized
cases by hand, records per-case results and exploratory sessions via
`/log-exploratory`, files `/bug-report` for every defect found. Their manual
evidence is what lets a feature ship before automation lands. Growth path:
toward Domain Test Analyst (deeper domain review) or Automation Engineer
(scripting under review).

## The three iron rules

1. **No scripting before human Design Gate approval or exact allrounder Design
   Gate bypass is recorded** — `/forge-scripts` will refuse.
2. **Humans decide gates and waivers.** Claude may transcribe a named
   allrounder's direct Design Gate approval, explicit Case Audit bypass, or
   explicit Design/Merge/Ops Gate bypass.
   PROBE Owner overrides require a valid local PIN-authorized receipt. Claude
   never decides approval or invents a bypass.
3. **Wrong wafer data is always `blocker`** — chart vs oracle vs DB must
   agree; three layers on every critical scenario (chart + oracle offline;
   the DB layer joins in live mode).

Lifecycle rule: every designed scenario permanently keeps `@manual`; Script
Forge adds `@automated` only when runnable, and `bddgen` selects that tag.
Manual-only means effective tags include `@manual` but not `@automated`,
including inherited Feature/Rule tags. Ops Gate requires exactly zero such
scenarios. Any exception must name exact `TC-*` ids, rationale, owner,
expiry/backfill date, and a human signature; percentages are not waivers.
