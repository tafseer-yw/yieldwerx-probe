---
name: probe-implementation
user-invocable: true
description: Use after Spec Probe when a local or otherwise reachable application exists and the team needs a structured comparison between approved requirements and the current implementation before designing cases. Observes behavior without treating the implementation as requirement truth. PROBE Implementation Probe stage.
track: design
safety: writes-local
produces: .probe/artifacts/<feature>/15-implementation-probe/implementation-comparison.md, .probe/artifacts/<feature>/15-implementation-probe/evidence/
consumes: .probe/artifacts/<feature>/10-spec/spec-analysis.md, docs/qa/<feature>/LEDGER.md, reachable application environment/build
argument-hint: <feature-slug> <env-or-url> [--role <role>] [--build <id>]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Implementation Probe

## Why

Reveal gaps between approved intent and a running build early without allowing
current implementation behavior to redefine the requirement.

## What

Compare every observable approved AC with an identified application build and
classify alignment, divergence, absence, observability gaps, or blockers.

## When

Run after Spec Probe and before Case Forge when a local or remote application
is reachable; it remains optional when no meaningful runtime exists.

## Where

Observe the configured application environment and write comparison evidence
to the consumer feature's configured `15-implementation-probe` location.

## How

Pin build/role/data provenance, use the configured runtime connector, walk the
minimum safe paths, record evidence per AC, separate undocumented behavior,
and prepare—but never automatically file—defect candidates.

Compare the approved requirement digest with a running build. Observe what the
application does; never redefine what it should do.

## Preconditions

- Spec Probe is `done`; `10-spec/spec-analysis.md` exists and passes its
  validator. Read it instead of reopening the raw PRD (P7).
- The environment or URL is explicit and reachable. Record `blocked` with the
  exact missing service/access when it is not; never turn unavailable evidence
  into `aligned` or `n/a`.
- Record build/commit, URL/environment, configuration/mode, role, browser, test
  data, and observation time. An unidentified moving build is not durable
  comparison evidence.
- Use a dedicated account and reversible data. Do not mutate production-like
  shared state destructively.

## Source boundary

Source precedence is:

`approved spec or durable human decision → current contract → observed implementation`.

Observed behavior is evidence, not intended truth. Never edit an AC, close an
ambiguity, or adopt an extra behavior merely because the current build behaves
that way.

## Procedure

1. Add the Implementation Probe ledger row when absent and mark it
   `in-progress`.
2. Read only the AC index, each Workflow or Simple Rule definition, confirmed
   decisions, open questions, where to check, test data needed, and how to know
   the correct result from `10-spec/spec-analysis.md`.
3. Build a comparison inventory:
   - include each AC observable through the running application;
   - mark an AC `not-observable` when its approved evidence requires an
     unavailable API/DB/event/export/audit surface;
   - do not manufacture UI checks for developer-owned non-UI behavior.
4. Launch the **implementation-prober** agent when available. Otherwise use
   the configured browser/runtime connector under the same read-only contract. If
   browser tooling is unavailable, mark the stage `blocked`; do not infer
   behavior from source code or screenshots alone.
5. Walk the minimum safe path needed to observe each AC. Use the approved data
   and role. Capture screenshots or text evidence for material states; redact
   secrets and personal/customer data.
6. Classify every AC:

   | Result            | Meaning                                                          |
   | ----------------- | ---------------------------------------------------------------- |
   | `aligned`         | observed behavior matches the approved expectation               |
   | `divergent`       | observed behavior contradicts the approved expectation           |
   | `not-implemented` | the required path or result is absent                            |
   | `not-observable`  | the build lacks the evidence surface needed to decide            |
   | `blocked`         | access, data, role, dependency, or environment stopped the check |

   Record application behavior outside the AC inventory separately as
   `undocumented`; it is never coverage and never a new AC without human
   approval.

7. For each non-aligned result, assign the PROBE severity and next disposition:
   - wrong calculation/data, authorization, persistence, export, audit, or
     destructive action mismatch → `blocker`;
   - missing required behavior or unusable verification surface → normally
     `high`;
   - cosmetic or non-critical difference → `medium|low`;
   - unclear intent → create an open-question recommendation; do not decide it.
8. Copy
   `references/implementation-comparison-template.md` and write
   `.probe/artifacts/<feature>/15-implementation-probe/implementation-comparison.md`
   with:
   - environment/build provenance;
   - one row per AC: `AC | expected | path/data/role | observed | result |
severity | evidence | disposition`;
   - undocumented-behavior table;
   - blocked/not-observable inventory;
   - counts and an overall comparison summary.
9. Prepare `/bug-report` candidates for confirmed divergences, but never file
   or sync them automatically. Human classification decides whether the build
   is wrong, the PRD is stale, or a durable product decision is missing.
10. Update the ledger:
    - `done — comparison complete` when every in-scope AC has a result, even
      when divergences exist;
    - `blocked` when the comparison could not be completed;
    - include aligned/divergent/not-implemented/not-observable/blocked counts,
      build identity, and artifact link.

## Downstream rules

- Case Forge designs from approved intent. A divergence becomes a known
  expected failure; it does not rewrite the case.
- A divergence alone does not block test design. An unresolved question that
  controls expected behavior does block the affected design scope.
- Design Gate reports comparison findings and known expected failures. Merge
  and Ops Gates still block on unresolved application defects unless a human
  approves a narrow waiver.
- UI Recon remains separate: it runs after Design Gate to harvest locators and
  testId gaps for approved cases. It may reuse route/label observations only
  when the build identity matches.
- Re-run Implementation Probe when the compared build changes materially or
  when an amendment changes an affected AC/expected result.
