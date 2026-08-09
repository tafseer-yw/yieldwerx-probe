---
name: bug-report
user-invocable: true
description: Use when any PROBE stage, assisted case execution, or CI uncovers an application defect - produces a reproducible, severity-classified bug report with an evidence-backed RCA status and prepares a reviewed Jira candidate. Cross-track.
track: cross
safety: writes-shared
produces: .probe/artifacts/<feature>/bugs/BUG-NN.md; classified candidate in .probe/artifacts/bug-sync/candidates/; optionally an external issue via the explicitly authorized configured syncBugs command
consumes: standardized failure-evidence packet or equivalent traces, screenshots, oracle diffs, logs, and exact failing Gherkin step
argument-hint: <feature-slug> <one-line-symptom>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Bug Report (cross-track)

## Why

Turn observed failures into reproducible, evidence-backed defects without
confusing application bugs with test, data, or environment problems.

## What

Create a severity-classified bug artifact, a validated synchronization
candidate, and - only when authorized - an issue in the configured tracker.

## When

Use from any PROBE stage or CI run after evidence indicates an application
defect; use Flake Triage first when the failure is intermittent.

## Where

Write under the consumer's configured PROBE bug and candidate locations, and
optionally synchronize through the configured issue-management integration.

## How

Capture minimal reproduction steps and redacted evidence, classify ownership
and severity, state whether root cause is confirmed, suspected, or unknown,
fingerprint the candidate, preview external changes, then require fresh human
approval before live filing.

Read the shared
[failure-evidence contract](../execute-cases/references/failure-evidence-contract.md)
before preparing the report.

## Procedure

1. Ingest the standardized `evidence.json` packet when `/execute-cases` or
   `/flake-triage` produced one. Otherwise normalize the available runner or
   manual evidence to the same fields. Require the TC/AIO/AC references when
   available, exact failing Gherkin step index/keyword/text, last successful
   step, expected/actual, environment, build, role, sanitized data identity,
   screenshot, browser logs/errors, relevant sanitized network evidence, and
   configured backend logs/correlation ID. Record unavailable evidence as a
   named gap; never call browser console output an application log.
2. Reproduce when safe and proportionate using the feature's approved evidence
   and data strategy from a clean state. Do not reproduce destructively,
   against sensitive production data, or when cost/privacy/safety makes it
   inappropriate. Preserve a strong one-time observation as `observed-once`;
   use `intermittent` only when repeated evidence supports it, with flake
   classification attached.
3. For domain-data/decision bugs, include independent expected-versus-actual
   evidence using the approved truth strategy. Incorrect calculations,
   classifications, persisted actions, authorization, cross-tenant isolation,
   alerts, exports, or lineage can be `blocker` when they corrupt trusted
   business truth or security.
4. Classify failure ownership as `app-bug | test-bug | sync-gap | data |
environment | infra | unknown`. Continue to a bug candidate only for an
   evidence-supported `app-bug`; route intermittent evidence through
   `/flake-triage`. Record root cause separately as
   `confirmed | suspected | unknown`. A symptom, component guess, or stack
   location is not a confirmed root cause.
5. Write `.probe/artifacts/<feature>/bugs/BUG-NN.md` with:
   - title (symptom, not cause), severity (`blocker|high|medium|low`),
     environment, commit/build, browser, and named PROBE source stage;
   - TC, AIO key when present, AC, scenario, exact failing Gherkin step, and
     last successful step;
   - numbered reproduction steps from a clean state with exact safe data;
   - independently supported expected result and observed actual result;
   - failure analysis: classification, frequency, impact, and evidence;
   - root-cause status and root cause, keeping hypotheses explicitly suspected;
   - failure-point screenshot, snapshot/trace/video, console/page errors,
     sanitized network, application logs/correlation ID, and evidence gaps.
6. Classify the candidate using the active bug lifecycle:
   - Automation-caught: update the schema-v3 candidate already written under
     `.probe/artifacts/bug-sync/candidates/<fingerprint>.json` with
     `classification: "app-bug"`, severity, and triage notes.
   - Assisted/manual finding: use the repository's current schema-v3
     `BugCandidate` builder/validator and stable fingerprint function; never
     handcraft unvalidated candidate JSON.

   Reuse the evidence packet's fingerprint where compatible so repeat
   occurrences deduplicate. Link redacted evidence rather than copying raw
   sensitive content into candidate JSON.

7. Preview with the configured `syncBugs` command; preview mode never writes to
   an external system. Before filing, set an exact, current `evidenceReview`
   approval. Screenshots, logs, DB extracts, traces, HARs, archives, and any
   customer/personal data require redaction and separate sensitive-evidence
   approval; any fresh evidence invalidates the review. A human must then
   authorize the configured live-write mode with complete HTTPS Jira
   configuration. Fingerprint deduplication must comment on an open matching
   issue rather than create a duplicate. Otherwise record `jira: pending`.
8. Update the feature ledger's notes with the BUG id and, if the bug blocks a
   workflow, set that workflow `blocked`.

Never auto-file from an execution failure. Creating a local candidate may be
automatic after classification; Jira creation, comments, and attachments still
require a fresh evidence review and explicit live-write authorization.

## Severity anchors

- Wrong trusted data/decision/action, security, or tenant isolation: `blocker`.
- Broken critical flow: `high`.
- Degraded UX with a workaround: `medium`.
- Cosmetic problem: `low`.
