# Python step conventions — TestComplete BDD

How step definitions are written in this team's TestComplete projects. Python
is the project language; it is fully supported for BDD (the only excluded
language is DelphiScript).

## Structure

- **One step unit per feature area**, mirroring the feature files, so a
  scenario and its bindings are found together. Shared helpers live in their
  own units — remembering that a unit can only be imported by a project in the
  same scripting language.
- **Steps are thin.** A step definition parses its parameters, calls a helper,
  and asserts. Application knowledge (how to open a report, how to read a grid
  row) lives in helper units — the desktop analogue of page objects — so ten
  steps do not encode the same dialog walk ten times.
- **Bindings quote the case's own words.** The binding expression matches the
  step text Case Forge wrote; the step is never reworded to make a binding
  easier. A step that cannot be bound as written is a finding for
  `/update-cases`, not a silent rewrite.

## Discipline

- **Aliases only** (`Aliases.yieldwerx.wndMain.btnRunDetection`); never a raw
  `Sys.Process(...)` walk in a step or helper that has an alias available.
- **Wait, never sleep**: `WaitAliasChild` / `WaitProperty` / alias lookups
  with explicit timeouts. A fixed delay is a `high` finding, exactly as on the
  web track.
- **Expected values come from `case-details.md`** or the oracle the case
  names — never captured from the running application at scripting time. A
  checkpoint whose baseline was recorded from the build under test proves that
  build agrees with itself.
- **Log for the next reader.** On failure, post the alias involved, the
  expected and actual values, and a screenshot to the test log — the exported
  log is the evidence packet the failure analysis starts from.
- **No environment forks in steps.** Environment differences (paths, database
  names) live in project variables fed by configuration, never `if env ==`
  branches inside a step body.

## What the auditor checks

`/audit-scripts` reviews desktop automation with the same anchors as web
automation: self-passing checkpoints (`blocker`), raw hierarchy walks and hard
waits (`high`), assertion-free scenarios (`high`), tag/traceability breaks
(`high`). The runner changed; the severity ladder did not.
