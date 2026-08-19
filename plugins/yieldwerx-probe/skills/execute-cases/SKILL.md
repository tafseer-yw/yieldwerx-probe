---
name: execute-cases
user-invocable: true
description: Use when Design-Gate-authorized UI cases should be executed through Playwright MCP in one controlled browser batch - reuses the browser connection, isolates every independent case, records every Gherkin step, and captures a standardized failure-evidence packet for triage and bug reporting.
track: design
safety: reads-external-writes-local
produces: .probe/artifacts/<feature>/50-exploratory/executions/execution-summary.md, runs/<TC-id>.md, failures/<fingerprint>/
consumes: approved Gherkin cases, a recorded human Design Gate approval, configured browser connector, optional UI Recon evidence
argument-hint: <feature-slug> [env] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Execute Cases

## Why

Execute several approved UI cases efficiently without repeatedly opening the
application, while preventing shared browser state from hiding defects or
making later cases depend on earlier ones.

## What

Drive the exact Gherkin steps through Playwright MCP in one browser batch,
record a step-level result for every case, and produce a redacted evidence
packet whenever a case fails or becomes blocked.

This is assisted manual execution evidence. It is not Playwright Test
automation, does not create scripts, and never adds `@automated`.

## When

Use after a recorded human Design Gate approval when
the application is reachable and approved cases should be executed against a
named build. Prefer the normal Playwright Test runner for implemented CI tests.

## Where

Drive only the configured, authorized environment through the configured
browser connector. Write run evidence under
`.probe/artifacts/<feature>/50-exploratory/executions/`; never write test
results directly to AIO or another external case-management system.

## How

Keep one MCP/browser connection open for the batch, reuse an authenticated
context only inside the same authorized role and tenant, establish a known
start state for each independent case, execute every Gherkin step, and capture
failure evidence before any recovery action.

Read [the failure-evidence contract](references/failure-evidence-contract.md)
before execution.

## Arguments

- `<feature-slug>` is required and selects the approved feature scope.
- `[env]` selects a configured environment; omit it only when the consumer has
  one unambiguous default.
- `--tc <id,id,...>` intersects the batch with exact TC IDs and fails closed
  when none match.
- `--role <role>` selects an authorized product role. Start a separate browser
  context whenever the role, identity, tenant, locale, or security boundary
  changes.
- `--continue-on-failure` continues after a fully captured failure only when
  cleanup succeeds and a known start state can be verified. The default is to
  stop after the first failure packet.

When UI Recon should collect selectors during the same actions, invoke
`/ui-recon ... --with-case-execution` as the single session coordinator rather
than starting both skills independently.

## Procedure

1. Resolve the requested feature, environment, role, tenant, build/version,
   and TC selector. Fail closed when the selector matches no cases. Accept only
   the exact Design-Gate-approved scope.
2. Confirm that the configured Playwright MCP browser tools are available and
   the target is reachable. If the connector is missing, stop and record the
   batch as blocked; do not fabricate execution. Never guess a launch command.
3. Create a batch manifest with executor, start time, build, environment, role,
   selected TC IDs, data strategy, cleanup strategy, and whether
   `--continue-on-failure` is enabled. Generate a run ID and use an application-
   supported correlation ID when available. Do not invent unsupported headers.
4. Open the application once. Reuse the browser connection for the batch. An
   authenticated context may be reused only for cases with the same authorized
   identity, role, tenant, locale, and other security-relevant settings.
   Start a separate context when any of those boundaries changes.
5. Before every independent case:
   - open a fresh page or restore the documented start page;
   - clear case-local storage, dialogs, downloads, routes, and transient UI
     state when the product contract permits it;
   - provision unique data and record identifiers created or mutated;
   - verify the stated Given preconditions rather than inferring them from a
     previous case.

   Reuse common step implementation, not common step results. Only explicitly
   sequential scenarios may share mutated business state, and their dependency
   must already be stated in the approved design.

6. Execute each Gherkin step in order. Record step index, keyword, exact text,
   UTC start/end time, action/observation, and `pass | fail | blocked`. Never
   skip a repeated step because another case already performed it. A session or
   environment failure blocks affected remaining cases; it does not turn them
   into application failures.
7. On the first unexpected result, capture the standardized evidence packet
   immediately, before navigation, retry, cleanup, or recovery. Include the
   last successful step and the exact failing step. Browser console output is
   not backend application logging; collect server logs only through a
   configured, authorized source and otherwise record the evidence gap.
8. Classify the failure as `app-bug | test-bug | sync-gap | data |
environment | infra | unknown` and set root-cause status to
   `confirmed | suspected | unknown`. Do not label a symptom as confirmed RCA.
   Route intermittent evidence to `/flake-triage`. Route a supported
   `app-bug` classification to `/bug-report` using the same evidence packet.
9. Without `--continue-on-failure`, stop after the evidence packet is complete.
   With it, continue only after cleanup and a verified known state. Stop the
   batch when authentication, environment health, data safety, or session
   integrity can no longer be trusted.
10. Write `runs/<TC-id>.md` for every selected case and an
    `execution-summary.md` containing totals, order, duration, per-case verdict,
    created/mutated data, cleanup status, evidence links, failure fingerprints,
    and blocked/not-run reasons. Hand the summary to `/log-exploratory` to
    consolidate the permanent manual-run record. External status sync remains
    a separate, explicitly authorized action.

## Rules

- Never run destructive cases against production-like or customer data without
  explicit environment, data, and cleanup authorization.
- Redact secrets, cookies, tokens, signed URLs, personal/customer values, and
  sensitive request or response bodies. Do not commit raw HAR files by default.
- Capture screenshots and logs at the failure point; a screenshot taken after
  reset or recovery is not failure evidence.
- A failed cleanup is recorded and stops any later case that could collide with
  the retained state.
- Reusing one browser process is an efficiency choice, never permission to
  share authorization boundaries or hidden test dependencies.
