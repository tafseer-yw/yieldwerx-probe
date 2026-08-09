---
paths:
  - 'src/**/*.ts'
  - 'steps/**/*.ts'
  - 'tests/**/*.ts'
  - 'scripts/**/*.ts'
---

# Coding conventions (TypeScript / test code)

- TypeScript strict; `any` is an ESLint error — use `unknown` + narrowing.
- No hard waits (`waitForTimeout`) and no `networkidle` — both ESLint errors.
  Poll with `expect.poll` via `src/utils/polling.ts`; sync charts via
  `src/plotly/`.
- No unawaited promises: `@typescript-eslint/no-floating-promises` (type-checked)
  is an ESLint error — an unawaited action/assertion is a silent flake. `await`
  it, or `void` it deliberately.
- No assertions in page objects; steps assert (import `expect` from
  `steps/fixtures.ts` — it carries the custom chart matchers).
- Browser `evaluate` callbacks are serialized: they must be self-contained
  (no references to Node-side helpers).
- Dependency direction is strictly downward (see CLAUDE.md architecture map).
  Never import sideways or upward (a page must not import a step; core imports
  nothing above it). This is mechanically enforced by
  `import-x/no-restricted-paths` (+ `no-cycle`) in `eslint.config.mjs`, not just
  convention. Fixtures (`src/core/fixtures.ts`) are the only DI mechanism — no
  globals, no shared mutable state between scenarios — and the sole file
  exempted from the core-is-bottom rule.
- Test data: golden fixtures in `test-data/golden/` (regenerable, drift-guarded
  by a self-test); parameterized wafers via `src/data/waferGenerator.ts`;
  runtime-unique values via `TestDataBuilder`. CSV, generator specs, loader
  JSON, and oracle inputs are strict contracts: reject non-finite/fractional
  values, invalid orientation, duplicates, out-of-bounds coordinates, and
  malformed dataset shapes instead of coercing them.
- Config precedence is committed JSON → `.env` → `.env.<E2E_ENV>` → process
  `E2E_*` variables (highest), validated by zod at startup. Live auth/DB modes
  require complete credentials/connection fields; booleans accept only
  `true`/`false`. Secrets NEVER in JSON or code. Mock switches: `auth.mock`,
  `db.mock`, `features.localViewer`.
- Non-idempotent API calls do not retry transient responses unless the caller
  supplies a stable backend-supported idempotency key. Queue waits use the
  validated `timeouts.queueJob` budget and the Playwright test timeout must
  exceed that budget.
- Artifact/HAR paths must resolve inside their approved roots. Recording a HAR
  requires the explicit sensitive-data acknowledgement and a human redaction
  review before commit; scratch/download writers must never silently overwrite.
- Environment/domain unknowns are marked `TODO(env)` / `TODO(domain)` — search
  before wiring a live environment.

## Tag & traceability vocabulary (scenarios in `features/`)

- Suite: `@smoke` `@regression` · Domain module (namespaced): `@module:cluster`
  `@module:pat` `@module:spc` `@module:swm` `@module:gdbn` `@module:sbyl`
  `@module:clm` `@module:amg` `@module:genealogy` `@module:binning`
  `@module:reports` (extend per app using the configured knowledge provider) ·
  Cross-cutting: `@wafermap` (any wafer-map surface) `@ruleengine` (shared async
  engine) `@api-workflow` `@resiliency` `@fuzz` · Quality: `@visual` `@a11y`
  `@performance` · Lifecycle: `@quarantine` `@manual`
  `@automated` · Demo-only: `@demo`.
- Scenario type (Task 3): `@positive` `@functional` `@negative` `@edge`.
- **Test type / level.** Exactly one primary per scenario, from the QA-owned
  set: `@testtype:e2e`, `@testtype:component`, `@testtype:security`,
  `@testtype:api`, `@testtype:contract`, or `@testtype:performance`. API means a
  business workflow or service behavior exercised through HTTP; contract means
  status/header/schema compatibility; performance means an approved workload/SLO
  implemented in k6, not Playwright. `unit` and implementation-internal
  `integration` remain developer-owned and go to the coverage hand-off.
  Orthogonal to scenario type and `@visual`/`@a11y`; pushed to AIO Labels.
- API/AIO boundary: `@api`, `@testtype:api`, `@testtype:contract`, and
  `@testtype:performance`
  scenarios remain repository-only and are never created, updated, linked, or
  reported in AIO.
- Automation candidacy (Tasks 4–5): `@auto:now` `@auto:next` `@auto:later`.
- Allure labels: `@epic:` `@feature:` `@story:` `@severity:`.
- **Case identity** — the TC id is first-class, not a comment:
  - an `@<TC-id>` tag on the scenario (verified existing durable id such as
    `@YWPD-TC-1202`, or repository-local `@TC-<slug>-NNN`; never fabricate an
    external id), and
  - the same id opening the scenario title:
    `Scenario: <TC-id> - Verify that …`.
  - `/sync-cases` **adds** the AIO/Jira key as a second tag (e.g. `@YWPD-TC-1202`);
    it never rewrites the title and never removes the local id.
  - a `# AC: AC-NN[,AC-NN]` comment above the scenario carries requirement
    traceability (the id lives in the tag/title, the AC mapping in the comment).
- **Step altitude for QA-owned scenarios** — imperative, procedural steps that a
  tester can follow. UI steps name affordances by their **visible label**
  (`Click the "Add New Policy" link`). Never a locator, testId, CSS selector or
  DOM id. API/contract steps use business operations and outcomes, never raw
  URLs, HTTP client calls, fixture names, or generic `send METHOD` plumbing.
  Status/header/schema literals belong in case details unless required behavior.
- **Audience boundary** — feature steps use visible product and domain language.
  Automation architecture (`oracle`, `fixture`, locator/testId/DOM/CSS/XPath,
  render synchronization, seeded mocks, page objects, implementation methods)
  belongs in case details, step definitions, and support code, not manual
  Gherkin. Use exact values or Examples placeholders; reject vague phrases such
  as `correctly`, `as required`, and `required data`.
- Every `<placeholder>` in a Scenario Outline must have an Examples header.
  Every Examples header must be used or explicitly identified as metadata-only.
- Every scenario carries a **description block** (the objective) on the line(s)
  directly under its title, so the file is executable without a second document.
- `@manual` and `@automated` are orthogonal, cumulative lifecycle tags.
  Case Forge puts `@manual` on every designed scenario permanently. Script
  Forge adds `@automated` when the approved scenario has runnable steps; it
  preserves the original `@manual` tag and case wording. A runnable automated
  scenario therefore carries both tags.
- **Manual-only count** is the number of designed scenarios whose effective
  tags include `@manual` but not `@automated`, including tags inherited from
  `Feature` or `Rule`. `bddgen` selects `@automated`; the presence of `@manual`
  never excludes a scenario. Successive Script Forge cycles must reduce the
  manual-only inventory to zero.
