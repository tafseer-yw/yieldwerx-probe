# Running desktop suites in CI — TestExecute, sessions, and exit codes

The three facts that make a desktop suite behave differently from a web suite
in CI. Source: SmartBear TestComplete documentation (command line and exit
codes), verified 2026-08-19.

## 1. An interactive user session is required

SmartBear is explicit: *"To run TestComplete tests, an interactive user
session is required. CI systems like Jenkins or Bamboo typically use
non-interactive user sessions."* TestComplete drives a real UI; there is no
headless mode.

Consequences for any PROBE stage that runs the desktop suite:

- the runner must provide an interactive session — SmartBear's
  **SessionCreator** utility, an auto-logon agent, or an unlocked interactive
  VM;
- the classic symptom of getting this wrong is a suite green on every desk and
  dead on the runner, usually failing object identification because there is
  no desktop to identify against. `/green-run` and `/testops-promote` classify
  that failure as **environment**, never as a test or application defect;
- an RDP session that disconnects can lock the desktop mid-run — a mid-suite
  cascade of identification failures after a clean start is a session
  problem first, a test problem second.

## 2. The command line

TestComplete and TestExecute share the contract (TestExecute is the
execution-only runner for CI). The shape consumers wire into
`commands.desktopTests`:

```
TestExecute.exe <suite>.pjs /run /project:<name> [/test:<item> | /tags:"<expr>"]
  /SilentMode /exit
  /ExportSummary:<results>.xml   ← JUnit-style XML, the CI-readable result
  /ExportLog:<log>.mht           ← the human-readable evidence bundle
  [/ErrorLog:<errors>.txt] [/Timeout:<seconds>]
```

`/SilentMode` suppresses interactive dialogs (errors go to the log);
`/exit` closes the runner when done. BDD slices select with a tag expression —
the same `@smoke` / `@regression` / feature tags the case set already carries.

## 3. Exit codes are a contract, not a boolean

| Code | Meaning | PROBE classification |
| --- | --- | --- |
| `0` | no errors or warnings | green |
| `1` | warnings, no errors | green with warnings — record them |
| `2` | test errors | **test failure** — diagnose per the normal loop |
| `3` | the test could not be run at all (missing item, syntax error, permissions) | **environment/config**, not a test failure |
| `4` | stopped by `/Timeout` | budget exceeded — investigate, never just raise the timeout |
| `127` | installation damaged / files missing | environment |
| `1000` | another TestComplete instance already running | environment — serialize desktop jobs per runner |
| `1001` | not enough free disk space | environment |
| `-1` | license check failed | environment — licensing, the on-call classic |

A wrapper that collapses all of these to pass/fail destroys the distinction
`/green-run` needs: **only exit 2 counts against the stability streak.** Codes
3, 4, 127, 1000, 1001, and −1 are environment findings recorded in the run
table with their code, and they reset nothing.

## Wiring notes for `/testops-promote`

- Desktop jobs are serialized per runner (exit 1000 is the enforcement
  mechanism finding you otherwise).
- Archive `/ExportLog` output with the run evidence; parse `/ExportSummary`
  as the result of record.
- The suite runs from a clean checkout plus the tester-agnostic project files;
  `.tcLS` and machine-local TestedApps paths must not be required for the run
  to work — if they are, that is a project-portability defect to fix, not to
  work around on the runner.
