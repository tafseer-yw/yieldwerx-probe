# Profile: testcomplete-winforms — desktop automation for the WinForms client

Load this profile when the work automates the yieldWerx WinForms desktop
application with SmartBear TestComplete. The QA track's desktop skills
(`/desktop-recon`, `/forge-desktop-scripts`) and the CI stages that run
desktop suites resolve their facts here.

**Source of these facts:** the SmartBear TestComplete documentation
(support.smartbear.com/testcomplete, verified 2026-08-19) and the yieldWerx
knowledgebase handbook Chapter 8 (the desktop application). Anything marked
`TODO(env)` must be confirmed against the team's actual TestComplete project
on first use and written back here.

## Commands

Every command resolves from `probe.config.yaml`; an absent key is reported
unavailable, never guessed.

| Purpose | `probe.config.yaml` key |
| --- | --- |
| Run the desktop suite (TestExecute/TestComplete command line) | `commands.desktopTests` |
| Run one tagged slice | `commands.desktopTestsTagged` |
| Export location for logs/JUnit summary | `commands.desktopReportDir` |
| Launch the application under test locally | `commands.desktopAppStart` |

`TODO(env)`: the project-suite path, project name, and whether runs use
TestComplete or TestExecute on the runner — confirm and record.

## Project structure (the pieces skills touch)

TestComplete organizes work as a **project suite** (`.pjs`) containing
**projects** (`.mds`); tester-specific settings live in `.tcLS` files and stay
out of source control. Inside a project, the items this profile cares about:

- **Scenarios** — the BDD project item: real Gherkin feature files, imported
  from disk or written in place. Standard Gherkin — tags, `Scenario Outline`,
  `Examples`, English or native-language keywords — is supported, and runs can
  select by tag.
- **Script units** — step definitions and helpers. **This team writes Python.**
  One scripting language per project; Python is fully supported for BDD (the
  only excluded language is DelphiScript).
- **NameMapping** — the object repository: the **Mapped Objects** tree (the
  application's object hierarchy with identification criteria) and the
  **Aliases** tree (the friendly names tests use). Authority:
  [rules/name-mapping-policy.md](rules/name-mapping-policy.md).
- **TestedApps** — the registered application under test, so tests launch it
  by name rather than by path.
- **Stores** — checkpoints' baseline data (images, files, object snapshots),
  the desktop analogue of the web track's visual baselines.

## The one case of record

The same `.feature` files Case Forge authors are the desktop suite's
scenarios. `/forge-desktop-scripts` imports them into the Scenarios item and
binds Python step definitions — it never rewrites a title, a step, or a tag,
exactly as the web scripts never do. One case of record, two runners; the TC
id, `# AC:` comment, and permanent `@manual` travel with the file.

## Operating model — a separate team, a shared case of record

The desktop suite is maintained by a different team from the one that designs
the cases and runs the web automation. That is workable, and it has exactly
three hazards worth naming, because all three are silent when they go wrong.

**The desktop team's repository is the TestComplete project.** The cases and the
ledger live in the QA repository. PROBE already resolves both from configuration,
so the desktop team's `probe.config.yaml` points at a checkout of that repository:

```yaml
profile: testcomplete-winforms
paths:
  features: ../yieldwerx-qa/features      # the QA repo's checkout
  ledgers:  ../yieldwerx-qa/docs/qa       # ledgers and gate approvals
  artifacts: .probe/artifacts             # this team's own working evidence
```

A path that does not resolve is **refused, never guessed** — a desktop run that
silently invented a feature set would automate cases nobody approved.

### Hazard 1 — the gate approval lives in the other repository

`/forge-desktop-scripts` refuses without a recorded human Design Gate approval,
and that approval is a row in the QA repository's ledger. The desktop team
therefore needs that checkout **current**: a stale clone can show an approval that
has since been superseded, or miss one that now exists. Pull before scripting, and
record in the forge notes which commit of the QA repository the run read.

### Hazard 2 — `@automated` is a write into the other team's repository

Adding `@automated` to a scenario edits a file the QA team owns. Two ways to do
that, and the profile picks by whether the desktop team has write access:

- **Write access** — apply the tag directly, exactly as the web forge does, and
  hand the diff to the QA repository's own review flow. Never commit anything but
  the tag; a desktop run touching a title, a step, or a local TC id is a defect.
- **No write access** — emit the exact edits as a list (file, scenario, tag to
  add) in `desktop-forge-notes.md` for the QA team to apply, and record the
  scenarios as `scripted, tag pending`. **Never report them as `@automated`
  before the tag actually lands** — the tag is the QA track's signal that a
  scenario is runnable, and claiming it early corrupts every count downstream.

### Hazard 3 — two teams, one feature file

The web forge tags web scenarios and the desktop forge tags desktop ones, often in
the same feature file. Keep them from colliding:

- select strictly on `@desktop` and touch no other scenario in the file;
- pull immediately before writing, and re-read the file rather than editing from a
  copy read earlier in the session;
- when a conflict does happen, the case file wins over both automations — resolve
  toward the QA team's version and re-apply the tag.

### What each team owns

| Owns | Team |
| --- | --- |
| The case of record (`.feature` files, titles, steps, tags except `@automated`) | QA |
| The ledger and its gate approvals | QA |
| The TestComplete project, Name Mapping, Python steps, run evidence | Desktop |
| The `@automated` tag on `@desktop` scenarios | Desktop, into the QA repository |
| Control `Name` properties in the WinForms source | Development |

## Conventions

- **Steps speak aliases, never trees.** A step definition reaches objects
  through `Aliases.<app>.<window>.<control>`; a raw hierarchy path or an
  index-based lookup in a step is the desktop equivalent of a hard-coded
  XPath and scores the same (`high`) under the severity ladder.
- **Wait, don't sleep.** Use the `Wait*` family (`WaitAliasChild`,
  `WaitProperty`, an explicit timeout on the alias lookup) — a bare delay is a
  hard wait, exactly as forbidden as on the web track.
- **Checkpoints carry expected values from case-details**, never values read
  from the application at scripting time — the self-passing-test rule does not
  change because the runner did.
- **Python step files mirror the feature structure** one-to-one so a scenario
  and its bindings are found together. Authority:
  [rules/python-step-conventions.md](rules/python-step-conventions.md).

## Test conventions

BDD scenarios run by tag through the command line; the JUnit summary
(`/ExportSummary`) is the CI-readable result and the exported log
(`/ExportLog`) is the evidence bundle. The exit-code contract and the
interactive-session requirement live in
[docs/ci-testexecute.md](docs/ci-testexecute.md) — read it before wiring any
runner, because a desktop suite fails in CI for reasons a web suite never
meets.

## Search anchors

- **Find a control's identity:** the Object Browser's identification
  properties for the live control; in the repo, grep the Aliases tree for the
  friendly name.
- **Find a step's binding:** grep the Python units for the step text or its
  binding expression.
- **Find why a run failed:** the exported log first, then the JUnit summary —
  the exit code alone distinguishes "tests failed" from "could not run"
  (see the CI doc).

## Traps

- **The compiler drops unset control names.** .NET builds include a control's
  `Name` only when the developer assigned one; without it, identification
  degrades to class + caption + index and breaks on the next layout change.
  This is the desktop's testability gap — `/desktop-recon` reports it, the dev
  track's D2 obligation fixes it.
- **An interactive session is required.** TestComplete drives a real UI; a
  headless CI agent session cannot run it. Symptom: a suite green on every
  desk and dead on the runner (see the CI doc).
- **Caption-based identification breaks by translation and by state.** A
  window found by caption fails the day the caption gains a document name or
  the product ships localized; captions are display, not identity.
- **One language per project.** A Python project cannot import a VBScript
  unit; a helper "borrowed" from a differently-scripted project silently
  cannot load.
- **Tester-specific files in source control** (`.tcLS`, local paths in
  TestedApps) make a project green for one person and broken for everyone
  else. Keep them ignored.
