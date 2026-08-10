---
name: seed-testability
user-invocable: true
description: Use when a build cannot be observed well enough to automate against — add the stable selector contracts the profile requires, bring the served API document back into parity with the code, and expose calculated results a test can read without scraping a rendering. Works from its own code scan; a recon gap list is optional extra input. PROBE development track.
track: dev
safety: writes-code
produces: selector contracts, API-document parity, and machine-readable result values in application code; .probe/artifacts/<feature>/70-build/testability-report.md
consumes: the application code and the active profile's selector policy. A UI Recon or API Recon gap list is optional enrichment, never required.
argument-hint: <feature-slug> [--from-recon <path>] [--surface ui|api|results|all] [--rank high|medium|all]
graph:
  consumes: [code:frontend, code:service, profile:active, artifact:40-ui-recon/testid-gaps.md?, artifact:40-api-recon/api-inventory.md?]
  produces: [artifact:70-build/testability-report.md, code:frontend, code:service, doc:openapi]
  delegates: [agent:testability-scout, agent:build-verifier]
  next: [skill:ui-recon, skill:api-recon, skill:forge-scripts, skill:review-code]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. The selector
> attribute, its naming grammar, and what counts as an assertable element come
> from the active profile's selector policy — read it explicitly; plugin
> reference files are not loaded for you.

# Seed Testability

## Why

UI Recon exists to harvest a build's automation contracts, and it regularly
finds there are none — every interactive control addressable only by its visible
text, an API document whose enum contradicts what the service accepts, a
calculated result that lives only inside a rendered image. Each of those is a
build obligation that was never met, and every one of them is cheap to fix in
the code and expensive to work around in the tests. This skill is the fix side,
so a recon gap list stops being a permanent apology and becomes a change.

## What

Stable selector contracts on the elements the profile's policy covers, a served
API document that matches the implementation exactly, machine-readable access to
the calculated values tests must assert, and a report mapping every closed gap
back to the recon finding that raised it.

## When

Run it as a sweep over code written before the observability obligation existed,
when a developer wants to know how automatable the build currently is, or when a
recon pass has produced a gap list to work from.

**A recon pass is not a prerequisite.** The `testability-scout` agent scans the
code directly, so this skill works on a repository where the QA track has never
run. New code should not need it at all: `/build-feature` and `/revise-feature`
clear their own `high` gaps before they close.

## Where

Application code in the consumer repository, on branch `feat/testability-<slug>`
unless the caller names another. The report goes to the configured `70-build`
artifact directory. This skill never edits a recon artifact, a feature file, or
a page object.

## How

Take the gap list, scan for what it missed, close gaps by rank without changing
behaviour, verify that nothing moved, and report the mapping back to recon.

## Preconditions — refuse if any fails

1. The active profile defines a selector policy. Without one there is no
   authority for what identifier to add:
   > "The active profile declares no selector policy. Define one before seeding
   > selector contracts, or the identifiers added here will not match what the
   > automation expects."
2. Unrelated working-tree changes are preserved, never reverted.
3. This skill changes observability, not behaviour. A gap that cannot be closed
   without changing what the application does is routed to `/revise-feature`,
   not closed here.

## Procedure

1. **Assemble the gap list.** Delegate to the **testability-scout** agent over
   the surfaces in `--surface` scope; its code scan is the base list and is
   sufficient on its own. If a recon artifact is named by `--from-recon` or
   found under the configured recon directories, union it in — recon sees only
   what it walked, and the scout sees only what it can read, so together they
   cover more than either. **Neither is required to be present**; say in the
   report which sources the list came from.
2. **Rank and select.** Apply `--rank`. Default to `high` — the surfaces that
   cannot be automated at all, and the contracts that silently lie. Report the
   `medium` and `low` gaps you are leaving so the count stays honest.
3. **Close selector gaps.** Add the identifier the policy's grammar prescribes,
   at the element the policy names. Two rules matter more than the rest:
   - **Give the container an identity as well as the control.** A row, a list, a
     panel, an empty state, and a chart container each need to be addressable, or
     every control inside them is scoped by position.
   - **A value-named handle is a gap even though it resolves today.** A trigger
     whose accessible name is its own current selection, or a cell whose name
     encodes its own on/off state, breaks the moment the state changes. Add a
     stable identifier and leave the state on the attribute that carries state.
4. **Close API-document drift.** For every route the scan flagged, make the
   served document match the implementation: the path, the method, the status
   codes it can return, the required fields, and — the one that costs the most
   when it is wrong — the enum values it actually accepts. Where the code and the
   document disagree about behaviour rather than description, **the code is not
   automatically right**: say which one the requirement supports, and fix that
   one.
5. **Expose unreadable results.** For each calculated value a test must assert
   that exists only in a rendering, add the cheapest machine-readable route the
   architecture already supports — the value in the response body, a data
   attribute beside the rendering, or a documented model field. Do not invent a
   debug endpoint, and do not expose anything a user of that role may not see.
6. **Change nothing else.** No renames, no refactors, no behaviour. This branch
   must be reviewable as "identifiers and documentation only", because that is
   what makes it safe to merge quickly.
7. **Verify.** Delegate to the **build-verifier** agent. The bar is that the full
   suite is unchanged — a seeding pass that alters a test result has changed
   behaviour and must be re-examined, not accepted.
8. **Report.** Write `70-build/testability-report.md`: every gap closed with its
   recon id, the identifier or document line added, and `file:line`; every gap
   deliberately left, with its rank and reason; the gaps the scout found that
   recon had not; and the totals before and after. Name the recon artifacts that
   are now stale so the QA track knows to re-walk rather than trusting a list
   that has been fixed underneath it.

## Boundaries

- **Never edit a page object, a feature file, or a recon artifact.** Those
  belong to the QA track. Adding an identifier in the application and adding it
  to the automation are two changes owned by two tracks; doing both here would
  let a test and its target be written to match each other rather than the
  requirement.
- **Never add an identifier that encodes state or a value.** State belongs on
  the attribute the platform provides for state. An identifier that changes is
  not a contract.
- **Never expose data through a testability hook that authorization would
  withhold.** A machine-readable result is subject to the same role checks as
  the rendering it mirrors.
- **A closed gap is closed in the code, not in the report.** Marking a gap
  resolved without a `file:line` is falsified evidence, and the severity ladder
  treats that as `blocker`.
- Do not commit to a deployment branch.
