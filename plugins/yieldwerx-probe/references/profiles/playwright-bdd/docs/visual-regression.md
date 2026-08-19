# Visual regression

Pixel regression for rendered charts — the check that catches what data-layer
assertions cannot: colorscale/legend rendering, ink-overlay z-order, notch
drawing, CSS bleed, and Plotly-upgrade rendering shifts. Data-layer tests
(`src/plotly/` vs oracle) prove the numbers; visual proves the pixels.
Authority for the `test:visual` layer and design decision #4.

For the actual test script, its feature-to-page connection, baseline images,
and an example expected/actual/diff result, see the
[End-to-End Test Script Walkthrough](end-to-end-test-script-walkthrough.md#15-the-visual-regression-companion-compares-pixels-with-an-approved-container-base).

## How it works today (odiff via the `toHaveScreenshotOdiff` matcher)

- **Engine:** [odiff](https://github.com/dmtrKovalenko/odiff) through its
  official [`playwright-odiff`](https://github.com/dmtrKovalenko/odiff/tree/main/npm_packages/playwright-odiff)
  package (pinned `4.4.2`; pulls `odiff-bin@4.4.2` transitively) — a native,
  anti-aliasing-aware comparator. It ships `toHaveScreenshotOdiff`, a drop-in
  replacement for Playwright's bundled `toHaveScreenshot` (pixelmatch); see
  [Comparator history](#comparator-history-why-odiff) below.
- **Registration:** the matcher is registered on the framework's single
  extended `expect` in `src/plotly/matchers.ts` (alongside the chart matchers),
  so steps get it typed via `steps/fixtures.ts` — no separate `expect.extend`
  wiring or global setup import.
- **Usage:** `steps/wafer-visual.steps.ts` asserts
  `await expect(page.getByTestId('wafer-map-chart')).toHaveScreenshotOdiff(name, opts)`.
  Capture stays on Playwright (so `data-testid` scoping, animation freezing, and
  masking are unchanged); the matcher additionally **bursts** — it re-captures
  with a double-`requestAnimationFrame` and polls until pixels stop changing —
  before comparing, which suppresses transient-render flake on top of our
  explicit render-sync.
- **Project:** a dedicated BDD `visual` project (`playwright.config.ts`) that
  `grep`s `@visual`, run via `npm run test:visual`.
- **Tolerance:** pinned in `src/utils/visualOdiff.ts` (`VISUAL_ODIFF_OPTIONS`):
  odiff `threshold: 0.1` (per-pixel color delta) with `antialiasing: true`,
  gated on `maxDiffPixelRatio: 0.001` (≤0.1% of pixels) — the exact reviewed
  allowance the old pixelmatch `maxDiffPixelRatio: 0.001` encoded. Ignoring
  anti-aliased pixels is the point of the switch: it removes the dominant
  false-positive source on wafer-map edges/markers. It is not proof that every
  single-die recolor fails; exact die correctness belongs to the numerical
  oracle.
- **Snapshot path:** pinned via `snapshotPathTemplate` →
  `tests/visual/baselines/visual/<name>.png`. The matcher resolves baselines
  through Playwright's own snapshot machinery (`_resolveSnapshotPaths`), which
  honors this template, so baselines did not move when the engine changed.
- **Baseline update:** `--update-snapshots` (`npm run test:visual:baseline`)
  regenerates baselines natively — the matcher writes the fresh capture as the
  new baseline on `all`/`changed`/`missing` update modes.
- **Report screenshots (baseline + actual):** the `@visual` step attaches the
  committed baseline AND the current render to the report so Allure shows both
  images. When they attach is config-driven via `visual.screenshots` (env
  `E2E_VISUAL_SCREENSHOTS`): `always` (default) attaches both on pass **and**
  fail; `on-failure` attaches nothing extra and leaves only the odiff matcher's
  own expected/actual/diff attachments, which fire only on a failed comparison.
  The pixel comparison itself is identical either way — this only governs report
  evidence. Attachment is best-effort: a missing baseline (first run) is skipped.
- **Masking:** `dynamicRegionMasks()` in `steps/wafer-visual.steps.ts` is the
  seam for excluding timestamps/user chrome on a live app (empty for the
  deterministic demo viewer); masks are applied by Playwright at capture time.
- **Coverage:** the golden wafers in the `Examples:` table of
  `features/visual/wafer-map-rendering.feature` (extend that table, not the
  step).
- **Guard:** `tests/selftest/visual-config.spec.ts` fails if the pinned odiff
  settings (threshold, anti-aliasing, max-diff ratio), the snapshot template,
  the `visual` project, the host `@visual` exclusion, or the container-only skip
  drift — or if the native pixelmatch `toHaveScreenshot` creeps back into the
  step/config.

### Demoing a failing pixel gate (`npm run test:visual:demo`)

`features/demo/visual-report-demo.feature` is a **deliberately failing**
`@visual` scenario kept only so the report can be demoed with a failing gate
next to the passing ones. It loads one golden wafer but pins it against a
_different_ wafer's committed baseline, so odiff always mismatches. It is
gated by the `@visual-demo` Before hook (`steps/demo/wafer-map.steps.ts`) and
**skips everywhere — normal suites and CI — unless `VISUAL_DEMO=1`**, so it
never reddens the real pipeline.

```bash
# run the passing visual scenarios AND the intentional-failure demo together
# (fresh pinned container); with visual.screenshots=always (default) the report
# shows baseline+actual on the passes and baseline+actual+diff on the failure:
npm run test:visual:demo
```

It is demo-only and severable — delete `features/demo/` (and the `@visual-demo`
hook) to reuse the framework for a real app.

### Container-only baselines (design decision #4 — non-negotiable)

Baselines are generated **only** inside a fresh build of the pinned Playwright
Docker image; host-generated screenshots differ per GPU/font stack and must
never gate a merge. The spec skips host runs. `FORCE_VISUAL` is a diagnostic
escape hatch, not an approved baseline workflow.

```bash
# (re)generate baselines — the ONLY sanctioned way:
npm run test:visual:baseline

# verify framework guards + visuals against committed baselines:
npm run test:visual

# true all-project run (Chromium BDD + self-tests + visual, fresh container):
npm run test:all
```

Review and commit the resulting `tests/visual/baselines/**` PNGs. The
compose service mounts baselines, reports, results, Allure, and `.probe`
evidence back to the host. In CI, visual/all use the same fresh pinned
container and archive those outputs before cleanup (requires Docker on the
agent—`TODO(env)` until one is provisioned).

> **Baseline status (2026-07-20):** the pinned container generated both golden
> wafer baselines, and a separate non-update `npm run test:all` run passed all
> 73 selected functional, framework, and visual tests. The PNGs are present in
> `tests/visual/baselines/` for human review. They must be committed before
> a clean clone or Jenkins agent can reproduce that green visual evidence.

## Comparator history (why odiff)

Playwright-native `toHaveScreenshot` (pixelmatch) was the Phase-1 engine: zero
extra deps, already wired. Its per-pixel diff throws false positives on
canvas/WebGL anti-aliasing, which is exactly the wafer-map failure mode, so the
engine was swapped to **odiff**. The first swap wired `odiff-bin` through a
hand-rolled comparator; that was then replaced by the odiff author's official
`playwright-odiff` package, which drops in as the `toHaveScreenshotOdiff`
matcher — same result with far less bespoke code, and it adds burst-until-stable
capture, a persistent `ODiffServer`, native `--update-snapshots`, and report
attachments for free. odiff's `antialiasing: true` ignores AA-only pixel deltas,
removing that flake class while staying **self-hosted/offline** (a prebuilt
binary; no screenshots leave the box). The alternatives considered, and why the
line stops at odiff:

| Option                                     | What it adds                                                     | Cost / trade-off                                          | Verdict                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Playwright native (pixelmatch)             | zero deps, already wired, container baselines                    | per-pixel diff; AA false positives on WebGL               | **superseded** — the AA flake it caused is why we moved                 |
| odiff via hand-rolled comparator           | AA-aware diff over Playwright capture                            | ~180 lines of framework code re-implementing paths/update | **superseded** — the official matcher does this better                  |
| **odiff via `playwright-odiff`** (current) | drop-in `toHaveScreenshotOdiff`; burst stability; offline binary | one dev dep; leans on Playwright internal (`_`) APIs      | **adopted** — least code, most features, maintained by the odiff author |
| **reg-suit**                               | baseline history, PR diff reports, S3/blob-backed baseline store | infra to host the baseline store; more moving parts       | adopt if baseline management at scale hurts                             |
| **SaaS** (Percy / Applitools / Argos)      | best diffing + review UX, hosted baselines                       | uploads screenshots off-box; paid; external CI dependency | **rejected** — conflicts with offline/data-sensitivity posture          |

Decision: **odiff via `playwright-odiff` is the engine.** Its one real
trade-off — reliance on Playwright internal APIs — is contained by the pinned
container Playwright version. Revisit reg-suit only with evidence
(baseline-management pain at scale). SaaS remains off the table while
wafer-yield pixels are sensitive.

## Which scenarios become visual tests (identified at Case Forge)

`@visual` scenarios are chosen deliberately during **Case Forge**, not ad hoc.
Every selected category first records `Visual candidates: <TC ids or planned
behaviors>` or `Visual: N/A — <specific reason>` in
`20-cases/coverage-notes.md`. The test-case-designer tags a scenario `@visual`
only when a behavior's
correctness lives in the pixels and nothing else can see it — colorscale
mapping, legend rendering, ink-overlay z-order, notch geometry, layout, CSS
bleed, or Plotly-upgrade rendering drift. Such a scenario pins a named baseline,
asserts the image only, and **complements** the data-layer scenario rather than
replacing it (a wrong _number_ is always an oracle/DB `blocker`). **The Design Gate digest**
then verifies that every rendering-only requirement has `@visual` coverage and
that no data assertion is misfiled as a pixel check. The `@visual` tag alone
routes the scenario to this container-only `visual` project (host projects
`grepInvert` it). Script Forge preserves `@visual` and adds `@automated` only
after the named baseline, approved masks, pinned container update/comparison
commands, and required expected/actual/diff evidence are runnable. Authority:
`${CLAUDE_PLUGIN_ROOT}/agents/test-case-designer.md` (design rule 5) and
`${CLAUDE_PLUGIN_ROOT}/references/process/PROBE-PROCESS.md` (P15).

## Scope & limits (honest)

- Chromium only; Firefox/WebKit render differently and are out of visual scope
  (they run data-layer cross-engine checks via `npm run test:cross`).
- One chart family (wafer map) today; histogram visual coverage is a follow-up
  once the demo app exposes a testId'd histogram container.
- Visual failures are rendering findings, not wrong-data findings — a wrong
  _number_ is caught by the oracle/DB layers and is always `blocker`.
