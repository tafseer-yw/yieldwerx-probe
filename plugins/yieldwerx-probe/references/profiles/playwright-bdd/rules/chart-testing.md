---
paths:
  - 'src/plotly/**'
  - 'steps/**'
  - 'features/**'
---

# Chart-testing contract

- Call `waitForRender()` before ANY chart accessor; wrap every
  redraw-triggering interaction in `afterRender(action)`. No chart assertion
  runs without render synchronization — this is what keeps chart tests
  deterministic on canvas/WebGL.
- **Three-layer verification** for every critical-path scenario: chart data
  (Plotly model) + database (`RuleEngineDb`) + numerical oracle
  (`src/oracle/`). Single-layer critical scenarios fail Script Audit at `high`.
- A chart that contradicts the oracle/DB is **wrong data — severity `blocker`,
  always**, regardless of how minor the delta looks.
- **Compare the data model, not pixels** — every chart type has a model-level
  comparison contract, and aggregate counts alone are never sufficient evidence:
  - Wafer maps are coordinate-level: each expected coordinate must match hard
    bin, soft bin, and ink flag; missing/extra coordinates, duplicate markers,
    malformed matrices, and mismatched parallel arrays fail. Notch assertions
    read rendered geometry, not application-authored metadata.
  - Histograms compare per-bin membership/counts and edges; SPC/trend charts
    compare per-point values plus UCL/LCL and each rule-violation flag; Pareto
    compares ordered category values + cumulative line; box plots compare the
    five-number summary + outlier points. Assert the series data, not a total.
  (The bundled wafer-map contract is one instance; other YieldWerx modules —
  PAT/SPC/reports — bring their own chart contracts. See
  the configured knowledge provider.)
- ALL chart access lives in `src/plotly/` (PlotlyChart, WaferMap, sync, coords,
  matchers). Steps never query chart DOM directly.
