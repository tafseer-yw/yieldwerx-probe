# PROBE Quick Reference

One page. Full authority: [PROBE-PROCESS.md](PROBE-PROCESS.md) ·
Copy-paste prompts for every step: [PROBE-PLAYBOOK.md](PROBE-PLAYBOOK.md) ·
Building the application under test: [DEV-TRACK.md](DEV-TRACK.md).

## Starting a new feature (the card)

```
 1. /probe-spec <feature-slug> <spec>     → spec-analysis + LEDGER created
 2. Answer the open questions it raised   (product / dev / Domain Test Analyst)
 3. /probe-implementation <feature-slug> <env>  → optional: approved ACs vs running build
                                                    (or add --compare-implementation <env>
                                                     to /probe-spec to chain it)
 4. /forge-cases <feature-slug> [selector]→ plain-language procedural Gherkin per category
                                            (permanent @manual), + pacing/candidacy plan
                                            + visual disposition AND API disposition
                                              per category
 5. /gate-design <feature-slug>           → evidence digest: counts, coverage, lint,
                                            and every gap. No verdict.
    ✍  A named human says "I have reviewed the cases and I approve them"
       → recorded with a timestamp; Case Sync and Script Forge unlock
       "continue" / "go ahead" is not an approval — ask which is meant
 6. /sync-cases <feature-slug> [--live]   → push approved scenarios to Jira AIO Tests as BDD
                                            cases; stable AIO keys written back (dry-run default)
 7. /ui-recon <feature-slug> [env]        → locators + optional API/execution tandem
      [--with-api-recon --spec <openapi>]
      [--with-case-execution --tc <ids> --role <role>]
    /execute-cases <feature-slug> [env]   → one MCP browser batch, isolated
                                            cases, step results + failure evidence
    /log-exploratory <feature-slug>       → exploratory sessions + manual runs
                                            of Design-Gate-approved cases
 8. /forge-scripts <feature-slug> [selector]→ add @automated when runnable; retain @manual
                                            and @visual; use the profile's named baseline,
                                            masks, deterministic runner, and comparison evidence
                                            (refuses without a recorded human
                                             Design Gate approval)
    /audit-scripts <feature-slug> [selector]→ ADVISORY independent code review, any time,
                                            optional; never a gate, blocks nothing
 9. /green-run <feature-slug> [selector]  → green ×3 consecutive, every run logged
10. /gate-merge <feature-slug>            → evidence digest incl. run history, lint,
                                            observability gaps, advisory findings
    ✍  A named human approves → recorded with a timestamp
       (the branch still uses normal merge authorization/protection)
11. /testops-promote <feature-slug>       → one CI run, fail-on-flake, Allure + durable PROBE evidence
12. /gate-ops <feature-slug>              → evidence digest: CI green ×N, flake rate,
                                            report history, AIO sync, manual-only inventory
    ✍  A named human approves → automation DONE
```

**Every gate is the same four steps:** assemble a digest of facts → present it →
record the human's decision with a timestamp → unlock the next stage. No
`READY`/`NOT READY`, no blocking checklist, no waiver, no bypass — a gate that has
not been approved is simply not approved. Approving with the listed gaps visible is
a legitimate recorded decision; removing a gap from the digest is falsified
evidence. Any role may approve any gate. Authority:
[human-gates.md](../governance/human-gates.md).

**Claude never writes an approval a human did not state.** It may transcribe one
they did.

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

## Building the application under test (the dev card)

```text
 0. /scaffold-app <app-slug> --stack <profile>   → contracts before features:
                                                    documented API, roles, datastore,
                                                    seed+reset, selector policy
 1. /build-feature <feature-slug> [--ac AC-NN]   → clarify → design → bounded tasks
                                                    → implement → verify to green
 2. /seed-testability <feature-slug>             → only for code that predates the
                                                    obligation; new code clears its own
 3. /review-code <feature-slug> [branch]         → independent GO / NO-GO
 4. /ship-change <feature-slug> [--push]         → commits + PR body + invalidation list

 changing behaviour → /revise-feature <slug> -- <what must change>
 a filed defect     → /fix-defect <slug> "<symptom>"   (failing test FIRST)
```

**None of these waits on a gate.** The dev card runs top to bottom on a
repository that has never used the QA track — no ledger is read, no Design,
Merge, or Ops Gate is checked, and no QA artifact has to exist. A spec analysis,
a bug candidate, and a recon gap list are all _better input_ where they exist,
never a precondition (DEV-TRACK policy D8).

Three rules keep the tracks from corrupting each other:

1. **The requirement owns behaviour.** Code never becomes the requirement; a
   mismatch goes back to `/probe-spec --reconcile` or into the build report's
   open questions.
2. **Testability is a build obligation.** Every control ships a stable
   identifier, every route ships in the served API document, every asserted value
   is readable without scraping a rendering. An unmet obligation makes the change
   `red` even when every command passed.
3. **Neither track edits the other's artifacts.** A dev change that makes a case
   wrong emits a downstream-invalidation list; `/update-cases` amends it.

`/review-code` never signs a gate. `/fix-defect` never closes a bug candidate.
`/ship-change` never merges.

## Where things live

| What                                            | Where                                              |
| ----------------------------------------------- | -------------------------------------------------- |
| Feature status (glance view)                    | `docs/qa/<feature>/LEDGER.md`                      |
| Working/run artifacts (gitignored; CI-archived) | `.probe/artifacts/<feature>/<NN-stage>/`           |
| Development-track artifacts                     | `.probe/artifacts/<feature>/70-build/`             |
| Gate reports (committed)                        | `docs/qa/<feature>/audit/gate-*.md`                |
| Conventions                                     | `CLAUDE.md` · locator policy, chart contract, tags |

## Severity ladder

|                |                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `blocker`      | wrong data on a chart/DB/export · self-passing test · falsified evidence — fix it, or it goes in the gate digest's Gaps section |
| `high`         | raw CSS/XPath · hard wait · missing render sync · single-layer critical scenario · traceability break — fix or record in Gaps   |
| `medium`       | convention drift — recorded; worth fixing while the code is warm                                                               |
| `low` / `info` | style · observations                                                                                                           |

Severity is vocabulary, not control flow. Nothing halts automatically; a human
reading the digest decides what each finding is worth.

## Typical sessions by role

**QA Lead** — kicks off features (`/probe-spec`), approves gates, owns the flake
log. Typical day: read a gate digest, approve it or send it back naming the gap
that mattered, run `/flake-triage` on last night's CI, decide one quarantine exit.

**Automation Engineer** — drives the scripting track:
`/forge-scripts` → `/green-run` → `/gate-merge`, running `/audit-scripts` when a
fresh reading would help and fixing what it finds. Approves gates.

**Domain Test Analyst** — owns test design quality: reviews `spec-analysis.md`
ambiguities, refines `/forge-cases` output with domain knowledge (bin semantics,
cluster/ink rules, notch conventions), and is usually the one who reads and
approves the **Design Gate** digest. Growth path into scripting: starts by fixing
`low`/`medium` script-review findings on a branch, graduating to `/forge-scripts`.

**Manual QA Engineer** — drives `/forge-cases` case drafting with the designer
agent, then owns human execution: runs the Design-Gate-approved cases by hand,
records per-case results and exploratory sessions via `/log-exploratory`, files
`/bug-report` for every defect found. Their manual evidence is what lets a feature
ship before automation lands. Growth path: toward Domain Test Analyst (deeper
domain review) or Automation Engineer (scripting).

Any role may approve any gate. There is no signer hierarchy and no waiver, because
there is nothing to waive.

## The three iron rules

1. **No scripting before a recorded human Design Gate approval** —
   `/forge-scripts` will refuse. This is the only place PROBE blocks, and it blocks
   on exactly one thing: whether a human has looked at the design.
2. **Humans decide gates.** Claude assembles the facts and may transcribe a
   decision a human stated. It never writes an approval nobody stated — not from a
   clean digest, not from an approval of a different scope, and not because every
   check passed.
3. **Wrong wafer data is always `blocker`** — chart vs oracle vs DB must
   agree; three layers on every critical scenario (chart + oracle offline;
   the DB layer joins in live mode).

Lifecycle rule: every designed scenario permanently keeps `@manual`; Script
Forge adds `@automated` only when runnable, and `bddgen` selects that tag.
Manual-only means effective tags include `@manual` but not `@automated`,
including inherited Feature/Rule tags. Every manual-only scenario carries a
disposition — `manual-permanent`, `deferred-until:<condition/date>`, or `retired` —
with an exact `TC-*` id, rationale, owner, and any expiry or backfill date. The Ops
Gate digest lists the inventory and names every scenario that has none; a
percentage is not a disposition.
