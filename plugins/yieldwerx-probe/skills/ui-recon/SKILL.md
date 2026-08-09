---
name: ui-recon
user-invocable: true
description: Use when a UI environment exists before scripting — drives the live app through the configured browser connector to walk cases authorized by Design Gate approval or explicit allrounder bypass, harvest stable selectors, capture states, and flag profile-defined observability gaps. Can coordinate API Recon and assisted case execution in the same authorized browser walk. PROBE UI Recon stage (optional but strongly recommended).
track: scripting
safety: writes-local
produces: .probe/artifacts/<feature>/40-ui-recon/ui-recon.md, locator-inventory.md, testid-gaps.md, network-observations.md, screenshots/
consumes: features/<feature-slug>/*.feature (approved permanent @manual scenarios; normally manual-only before Script Forge), 20-cases/case-details.md, env config for the target environment, optional Swagger/OpenAPI document
argument-hint: <feature-slug> [env] [--with-api-recon] [--spec <path-or-url>] [--with-case-execution] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# UI Recon

## Why

Replace guessed selectors and interaction assumptions with observed,
versioned UI contracts before automation is written.

## What

Walk approved UI cases, capture states, inventory stable selectors, assess
executability, and identify profile-defined observability gaps.

## When

Run after the Design Gate and before Script Forge whenever the selected cases
have a reachable UI surface.

## Where

Observe the configured application through its browser connector and write
recon logs, screenshots, locator inventory, and gaps under `40-ui-recon`.

## How

Use safe dedicated data, execute each approved visible path read-only where
possible, record stable selectors and evidence, prepare—not automatically
file—gap tickets, and mark inaccessible cases blocked rather than guessing.

Reconnaissance of applicable live surfaces so /forge-scripts consumes observed
contracts instead of guessing. For API-only, batch, queue, file, or backend-only
features, record `UI Recon: n/a — no UI surface` and perform the corresponding
API/event/DB/audit observability reconnaissance during Script Forge.

## Arguments

- `<feature-slug>` is required; `[env]` selects the configured target.
- `--with-api-recon` registers sanitized network observation before the walk
  and reconciles the result with `--spec <path-or-url>` when supplied.
- `--with-case-execution` records every selected Gherkin step as an assisted
  execution during the same walk and writes `50-exploratory/executions`.
- `--tc <id,id,...>` restricts both recon and execution to exact approved TCs.
- `--role <role>` selects the authorized role; security-boundary changes always
  receive a separate browser context.
- `--continue-on-failure` applies only to assisted execution and requires a
  complete failure packet, successful cleanup, and verified reset before the
  next case.

## Tandem mode

Use `--with-api-recon --spec <path-or-url>` when the approved UI walk is also
the best source of live API evidence. UI Recon remains responsible for screens,
states, selectors, and per-case UI executability. API Recon remains responsible
for HTTP operation identity, payload/response shapes, authentication,
dependencies, provenance, and contract drift. Register sanitized network
observation before the first UI action, reuse the same browser context, and
write both artifact sets. This is one coordinated session, not two agents
independently driving the same page.

Add `--with-case-execution` when the same approved actions should also count as
assisted case execution. UI Recon remains responsible for selectors and UI
states; API Recon owns the reconciled HTTP contract; Execute Cases owns exact
step verdicts, cleanup, and failure evidence. Capture each action once and
write it to every applicable artifact. When all three are needed, use:

```text
/ui-recon <feature> <env> --with-api-recon --spec <openapi> \
  --with-case-execution --tc <id,id,...> [--continue-on-failure]
```

## Preconditions

- Human Design Gate approval or explicit allrounder Design Gate bypass
  recorded — recon walks only that exact authorized scope.
- For UI categories, a reachable configured environment with real URLs and the
  **configured browser connector**. If either is missing, stop, mark UI Recon
  `blocked` in the ledger with the reason, and say what's needed. This does not
  block categories with no UI surface.

## Procedure

1. Mark UI Recon `in-progress`. When API tandem is selected, resolve the API
   specification and start the scoped, sanitized request/response observer
   before the first approved UI action. When execution tandem is selected,
   create the Execute Cases batch manifest and load its
   [failure-evidence contract](../execute-cases/references/failure-evidence-contract.md)
   before opening the application.
2. Launch the **ui-recon-agent** when available with the feature slug, target
   env, and approved case list. If unavailable but the browser tooling exists,
   perform the same read-only recon locally. It returns:
   walk log · locator inventory · testId gap list · per-case executability
   verdict · screenshots.
3. Persist to `.probe/artifacts/<feature>/40-ui-recon/`:
   - `ui-recon.md` (walk log + verdicts)
   - `locator-inventory.md` (element → locator table; the scripter's source of truth)
   - `testid-gaps.md` (profile-defined selector/observability gaps and suggested hooks)
   - `network-observations.md` (sanitized request/response metadata tied to UI
     actions: method, normalized URL, status, content type, timing, and payload
     shape; omit assets, analytics, secrets, cookies, tokens, customer data,
     and unreviewed bodies)
   - `screenshots/NN-<state>.png`
4. With `--with-case-execution`, also write per-step TC results, the batch
   summary, data/cleanup status, and any failure packet under
   `50-exploratory/executions/`. Apply Execute Cases isolation rules between
   independent TCs. Route intermittent failures to `/flake-triage` and
   supported application defects to `/bug-report`; do not repeat the UI actions.
5. In API tandem mode, keep the browser context alive until the approved walk and
   capture are complete, then hand `network-observations.md` plus the supplied
   specification to API Recon for method+normalized-path reconciliation. Write
   `40-api-recon` artifacts without repeating already covered UI actions; walk
   an additional path only when it is separately approved and needed to close
   a recorded capture gap. A blocked API reconciliation does not erase valid UI
   Recon evidence—record the partial outcome in the ledger.
6. **Prepare observability-gap ticket candidates.** File them only with explicit user
   authorization; otherwise list them in `testid-gaps.md` as `tickets: pending` — the
   Merge Gate checks the active profile's required selector/observability contract).
7. Cases verdicted `blocked` go back to the team: either the spec changed, the
   env is broken, or the case is wrong — record which in the ledger.
8. Update the ledger: UI Recon `done`, artifact links, gap count + ticket refs;
   link every tandem skill's independently owned artifacts and status. Hand an
   execution summary to `/log-exploratory` without syncing AIO directly.

## Rules

- Recon never mutates shared data destructively; use dedicated test accounts.
- Apply specialized chart/canvas rules only when the active profile defines
  them; do not treat framework-specific hooks as universal.
- Prefer stable selectors that express user behavior and comply with the
  active profile. Record created data and restore/retain it per environment policy.
- Network capture is a handoff to `/api-recon`, not a complete API contract.
  Correlate calls to UI steps and label blocking, background, polling, and
  third-party calls. Never infer complete schemas from one payload or commit a
  raw HAR by default.
