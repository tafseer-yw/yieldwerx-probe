---
name: forge-desktop-scripts
user-invocable: true
description: Use when approved @desktop-tagged cases covering the WinForms desktop application must become TestComplete BDD automation — the same .feature files imported into the Scenarios project item, Python step definitions bound to the case's own words, objects reached through Name Mapping aliases only, and @automated added while permanent @manual stays. One case of record, two runners: the desktop twin of /forge-scripts, refusing without a recorded human Design Gate approval exactly as the web forge does. PROBE Desktop Script Forge stage.
track: scripting
safety: writes-local
produces: feature files imported to the TestComplete Scenarios item, Python step units and helpers, Name Mapping entries, .probe/artifacts/<feature>/60-scripts/desktop-forge-notes.md
consumes: features/<feature-slug>/*.feature (@desktop-tagged scenarios in the confirmed @auto:now set), 20-cases/case-details.md, 40-desktop-recon/name-mapping-inventory.md when it exists, the testcomplete-winforms profile
argument-hint: <feature-slug> [--category CAT-NN] [--tc TC-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Desktop Script Forge (TestComplete)

## Why

The desktop application is where the heavy report deliverables are produced,
and it has had no scripted coverage path — every desktop case was manual
forever by default. TestComplete's native Gherkin support means the cases the
team already designs can drive the desktop too, without a second case format
or a second traceability model.

## What

The approved `@desktop`-tagged scenarios imported into the TestComplete
project's **Scenarios** item unchanged, **Python** step definitions bound to
the case's own step text, Name Mapping aliases for every object touched (from
the recon inventory where it exists), and `desktop-forge-notes.md` mapping
TC id → feature file → step units → run result.

## When

Run after the Design Gate approval confirms the `@auto:now` set, ideally after
`/desktop-recon`. Rerun per automation cycle as more desktop cases are
promoted.

## Where

The team's TestComplete project (Scenarios, Script, NameMapping items) and the
feature's `60-scripts` artifact directory. Which project: `TODO(env)` in the
profile until the consumer records it.

## How

Freeze the authorized TC scope, import the feature files without rewriting
them, bind Python steps per the profile's conventions, map objects per the
Name Mapping policy, run the tagged slice through the configured command, and
add `@automated` only to scenarios that actually ran.

## Preconditions — REFUSE if any fails

1. **A recorded human Design Gate approval covers the scope** — the ledger's
   Gate approvals table, a human name and a timestamp, exactly the check
   `/forge-scripts` makes (policy P4 does not care which runner automates the
   case).
2. The scenarios in scope carry `@desktop`, a TC identity tag, and a
   `# AC:` comment — a case whose tag and title disagree stops here, fixed
   through `/update-cases` first.
3. The `testcomplete-winforms` profile's `TODO(env)` items for project path
   and run command are resolved in `probe.config.yaml`, or the close state is
   `BLOCKED` naming exactly what is missing.
4. **The case and ledger paths resolve.** This skill is normally run by a
   different team from the one that owns the cases, so `paths.features` and
   `paths.ledgers` usually point at a checkout of the QA repository. A path that
   does not resolve is `BLOCKED` naming it — never a guess, because a guessed
   feature set automates cases nobody approved. Pull that checkout before
   scripting and record which commit of it this run read: an approval can be
   superseded between clones. Authority: the profile's **Operating model**
   section.

## Procedure

1. **Freeze the scope**: requested selectors ∩ the confirmed `@auto:now` set ∩
   `@desktop`. Note that `@desktop` is a surface tag carried *alongside* the
   scenario's real level (`@testtype:e2e`, `@testtype:component`, …) — select on
   `@desktop`, never on a level. Record the exact TC ids.
2. **Import, never transcribe.** The `.feature` files enter the Scenarios item
   as-is — title, steps, tags, `# AC:` comments untouched. The repository
   copy remains the source; the project's copy is an import of it, refreshed
   on change, so the two never fork. Note the import method (file load) in the
   forge notes.
3. **Map the objects.** Create Name Mapping entries and aliases for every
   control the scenarios touch, from the recon inventory's proposals where it
   exists — ladder rung 1 identification wherever the control has a name,
   and a recorded gap reference for anything that does not (scripting against
   a gap is allowed but the note says the alias is fragile and why).
4. **Bind Python steps** per the profile's step conventions: thin steps,
   helpers for application knowledge, aliases only, `Wait*` never sleeps,
   expected values from `case-details.md`. A step that cannot be bound as
   written is routed to `/update-cases`, never reworded here.
5. **Run the exact scope** via the configured `desktopTestsTagged` command
   with this feature's tags; interpret exit codes per the profile's CI
   document — only exit 2 is a test failure; 3/4/127/1000/1001/−1 are
   environment findings.
6. **Tag on proof, into the right repository.** Add `@automated` (keeping
   permanent `@manual`) only to scenarios that executed in step 5. A scenario
   scripted but not yet run stays manual-only with its state in the notes —
   `@automated` is a claim of runnability, not of effort.

   The tag is a write into the QA team's files. With write access to that
   checkout, apply it and touch nothing else in the file — select strictly on
   `@desktop`, re-read the file immediately before editing (the web forge may be
   tagging the same file), and hand the diff to that repository's review flow.
   **Without write access, do not apply it**: list the exact edits (file,
   scenario, tag) in the forge notes for the QA team, and record those scenarios
   as `scripted, tag pending`. Reporting them as `@automated` before the tag
   lands corrupts every downstream count.
7. **Write `desktop-forge-notes.md`**: TC ids automated, step units and
   mapping entries created, run command and verbatim result, fragile aliases
   with their gap references, and blockers. Update the ledger's Script Forge
   row with the desktop cycle.

## Boundaries

- **Never rewrite a case to fit the runner** — not a title, not a step, not a
  tag. The case is the record; the runner adapts.
- Keyword tests are not authored here — Python BDD bindings only, so the
  project stays reviewable in source control.
- Checkpoint baselines follow the same rule as web visual baselines: named,
  reviewed, and never captured from the build under test as their own truth.
- AIO: desktop scenarios are ordinary AIO-eligible cases (they are manual
  records first); `/sync-cases` handles them exactly like web scenarios.
- `/audit-scripts` reviews the result with the same severity anchors; the
  Stability Run and Merge Gate treat desktop evidence like any other, with the
  exit-code contract from the profile's CI document.
