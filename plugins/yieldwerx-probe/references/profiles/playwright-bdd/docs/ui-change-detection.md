# UI Change Detection & Test Impact — frontend-embedded mode

When this framework is placed **inside a YieldWerx frontend repo**, a
built-in mechanism detects UI changes that affect existing tests and tells
the developer — **before they push** — which test cases and scripts need
updating. This page explains how it works and walks through real, executable
examples against the in-repo demo app.

> **Scope: frontend-embedded deployments only.** In standalone mode (this
> framework in its own repo, no application source alongside) the feature is
> intentionally inactive — every command below detects that and exits
> cleanly with a notice. In _this_ repo it runs against `demo-app/` purely
> as the reference example.

## How it works — three layers

| Layer                        | What                                                                                                                                                                                                                                                   | Command               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| **1 · UI contract manifest** | [`ui-contract.json`](../ui-contract.json) — every `data-testid` (and the Plotly chart contract) the framework consumes, extracted mechanically from `src/pages`, `src/components`, `steps`. Drift-guarded by a self-test, like the goldens.            | `npm run ui:contract` |
| **2 · Contract drift check** | Diffs the manifest against the frontend source: a removed/renamed testId **fails** and names the consuming page object, the broken scenarios, and the stale manual cases (via the traceability chain).                                                 | `npm run ui:check`    |
| **3 · Change impact report** | Feature-level test impact analysis: reads the git diff, filters to frontend paths, resolves — via [`ui-impact-map.json`](../ui-impact-map.json) — the impacted page objects, scenarios, tags, and AIO case ids, with the exact command to re-run them. | `npm run ui:impact`   |

On top sits the **`/change-impact` skill** (PROBE cross-track): it runs both
scripts, reads the actual diff hunks, classifies each change (locator /
chart-contract / flow drift — the last one is what stales _manual_ cases,
which no static tool sees), and writes a report with **proposed fixes**.
Proposals are never auto-applied — humans decide, and substantive script
changes still pass Script Audit. Silent self-healing is deliberately not
used: it hides contract breaks instead of fixing tests before the push.

## Executable example 1 — a dev renames a testId

Simulate a frontend developer renaming `wafer-csv-input` in the demo app,
then run the check (from the repo root):

```bash
sed -i 's/data-testid="wafer-csv-input"/data-testid="csv-input-renamed"/' demo-app/wafer-viewer/index.html
npm run ui:check
```

Real output (exit code 1 — this blocks a wired pre-push hook / PR check):

```
UI contract check — frontend: demo-app
  required testIds checked: 8 · provided by frontend: 10 · not applicable here: 9

  FAIL — 1 required data-testid(s) missing from the frontend:

  ✖ data-testid="wafer-csv-input"
      consumed by: src/pages/WaferAnalysisPage.ts
      breaks scenarios in: features/demo/cluster-detection.feature
      stale manual cases: TC-wafer-map-cluster-detection-001, TC-wafer-map-cluster-detection-002,
                          TC-wafer-map-cluster-detection-003, TC-wafer-map-cluster-detection-004,
                          TC-wafer-map-cluster-detection-005
      re-run after fixing: npx bddgen && npx playwright test --project=chromium --grep "@wafermap"

  Fix the rename in the frontend OR update the page objects + test cases
  (then regenerate the manifest: npm run ui:contract) BEFORE pushing.
```

Restore the demo app (its page is generated, so restoration is one command):

```bash
npx tsx scripts/gen-wafer-viewer.ts
npm run ui:check    # → PASS — the frontend provides every required data-testid.
```

## Executable example 2 — what did my change impact?

Touch any demo-app file (or just have uncommitted frontend changes) and ask:

```bash
npm run ui:impact
```

Real output (from a working tree where both demo-app files differ from
`origin/main`):

```
UI change impact — frontend: demo-app · base: origin/main
  changed files: 52 total, 2 in the frontend

  Frontend changes:
    · demo-app/wafer-viewer/index.html
    · demo-app/wafer-viewer/viewer.js

  Impacted framework surface:
    page object: src/pages/WaferAnalysisPage.ts
    scenarios:   features/demo/cluster-detection.feature
    manual cases to review: TC-wafer-map-cluster-detection-001, ..., TC-wafer-map-cluster-detection-005

  Verify before pushing:
    npm run ui:check
    npx bddgen && npx playwright test --project=chromium --grep "@wafermap"

  For a reasoned report with proposed fixes, run the /change-impact skill.
```

Changed frontend files that match no mapping are listed with a ⚠ — add the
`frontendGlobs` entry or confirm they're test-irrelevant. Unmapped ≠ safe.

## Executable example 3 — the AI layer

In Claude Code:

```
/change-impact
```

> Frontend code changed — run the change-impact analysis: contract check,
> feature-level impact, read the diff hunks, and propose the test-case and
> script updates.

You get `.probe/artifacts/change-impact/<ref>.md`: change → drift surface →
impacted scenarios/cases, plus proposed locator/step/manual-case fixes to
apply _before_ pushing.

## Wiring it into a real frontend repo (adoption)

1. Embed the framework per the [adoption guide](adoption-guide.md) and set
   `"frontendRoot"` in `ui-impact-map.json` to the app source (e.g. `"src"`),
   with `frontendGlobs` mapping app areas → page objects.
2. **Pre-push hook** (fast local feedback): add to `.husky/pre-push`:
   ```bash
   npm run ui:check && npm run ui:impact
   ```
3. **PR status check** (the enforcement — hooks are bypassable): run
   `npm run ui:check` as a required job; optionally run the impacted tag
   slice from `ui:impact` instead of the full suite.
4. Keep the manifest honest: `npm run ui:contract` whenever page objects
   change (the drift-guard self-test fails the build if you forget), and add
   a `pageMap` entry for every new page object (Merge-Gate checklist item).

## Known limits (v1, by design)

- **Static check covers testIds** — `getByRole` locators and runtime-only
  attributes aren't statically verifiable; UI Recon (`/ui-recon`) and the runtime
  suite cover those. Dynamic id patterns (e.g. `filter-${name}`) are recorded
  in the manifest as `pattern: true` and skipped by the static check.
- **The chart contract is checked at container level** statically (the
  testIds); trace/customdata shape is asserted at runtime by the self-tests
  and scenarios.
- **Behavior drift needs the AI layer** — a reordered wizard step changes no
  testId; `/change-impact` reading the diff hunks (and ultimately Exploratory Run manual
  runs) is what catches it.
- **Consumers only bind through the impact map** — testIds used by page
  objects not mapped to this frontend are reported as "not applicable", not
  failed (the demo app doesn't implement the login screen, so `login-*` ids
  are not required of it).
