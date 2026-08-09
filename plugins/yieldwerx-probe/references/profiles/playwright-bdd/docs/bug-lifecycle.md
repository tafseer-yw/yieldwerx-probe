# Bug Lifecycle — durable candidates, reviewed Jira filing, and RCA feedback

How a defect found by this framework (automated run or manual/exploratory
session) becomes a Jira-ready candidate automatically and, after explicit
human authorization, a Jira bug with full metadata; it also describes how the
developer's fix + root-cause analysis flows back to keep the test suite
current. Companion to the PROBE cross-track skills `/bug-report` and
`/flake-triage`; the return path is `/rca-sync` (Phase 2, designed below).

---

## 1. The design rule: never file raw failures

Most E2E failures are **not application bugs** — they are test bugs, sync
gaps, data problems, or environment issues. A pipeline that auto-files every
red test creates a Jira channel developers learn to ignore. So this pipeline
puts two things between a failure and a ticket:

1. **Classification** — only failures triaged as `app-bug` are filed
   (`/flake-triage` or `/bug-report` sets the verdict; in CI a headless
   classification step can make the loop fully unattended).
2. **Fingerprint dedup** — the same defect re-failing across runs, retries,
   and shards updates ONE candidate and comments on ONE Jira issue instead of
   spawning duplicates.

## 2. Outbound pipeline: failure → Jira

| Stage        | Component                                                 | What it does                                                                                                                                                                                                                    |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Collect**  | `src/core/bugCandidateReporter.ts` (always-on)            | Every final unexpected failure and retry-then-pass flake → schema-validated candidate JSON plus copied durable evidence under `.probe/artifacts/bug-sync/`; advisory locking and atomic writes protect concurrent shards        |
| **Classify** | `/flake-triage` or `/bug-report` (human or headless)      | Sets `classification` (`app-bug` \| `test-bug` \| `sync-gap` \| `data` \| `environment` \| `infra`), `severity`, `triageNotes` in the candidate                                                                                 |
| **File**     | `npm run bug:sync -- --live` (`scripts/jira-bug-sync.ts`) | After explicit live authorization, files fully triaged `app-bug` candidates to HTTPS Jira: fingerprint-deduped, fresh evidence attached, issue key persisted, immutable filed copy retained. Without `--live`, it only previews |

**The fingerprint** is `sha1(scenario + failing Gherkin step + normalized
error)` — the error is normalized first (ANSI codes, paths, durations, and
literal numbers stripped), so `Expected: 479 / Received: 480` and
`Expected: 312 / Received: 313` are the SAME defect identity. Guaranteed by
focused framework self-tests (`tests/selftest/bug-fingerprint.spec.ts`).

**Candidate metadata** (versioned zod schema: `BugCandidate` in
`src/core/bugCandidateReporter.ts`): scenario, tags, failing step, error
(raw + normalized), evidence paths (trace/screenshot/video/error-context),
environment (env name, commit, OS, node, CI), occurrence timestamps, triage
fields, outcome (`failed` or `flaky`), and Jira key once filed. Evidence is
copied into an approved `.probe` root while it still exists; a re-failure
merges under a lock, occurrences accumulate, fresh evidence is retained, and
**human triage state is never overwritten**.

Before live filing, schema v3 requires `evidenceReview` with reviewer identity,
review time, and the exact current attachment paths in `approvedPaths`.
Trace/HAR/ZIP files may contain secrets and must also appear in
`approvedSensitivePaths`. If a later run adds fresh evidence, the reporter
clears the review; stale approval never silently covers a new attachment.

**Manual findings use the same contract**: `/bug-report` writes a candidate
with `foundDuring: "manual"` and the same schema, so manual and automated
bugs are indistinguishable in Jira except for a `found-manual` label.

### Jira connection

Set four environment variables (never in JSON or code — same secrets policy
as everything else):

```
JIRA_BASE_URL=https://<yourcompany>.atlassian.net
JIRA_EMAIL=<service-account email>
JIRA_API_TOKEN=<api token>
JIRA_PROJECT_KEY=<project key, e.g. YW>
JIRA_ISSUE_TYPE=Bug            # optional, default Bug
```

Deliberately independent of the zod `E2E_*` config so the filer runs in any
frontend repo's CI without loading the full framework configuration. The base
URL must be HTTPS. `bug:sync` is always a **dry run** unless the operator passes
`--live` (or deliberately sets `JIRA_SYNC_MODE=live`) and supplies every Jira
credential. This separates triage from the external side effect.

Dedup on the Jira side: every issue carries an `fp-<hash>` label. Before
creating, the filer runs JQL for an open issue with that label — a hit gets an
occurrence comment and the newly approved evidence rather than a duplicate.
Candidate input is treated as untrusted: queue containment, schema version,
attachment roots, symlink targets, regular-file type, and size are checked.

## 3. Executable example on the demo app

Everything below was actually run in this repo; outputs are captured, not
typed. Total time ≈ 2 minutes.

### Step 1 — plant a real data bug in the demo app

Make the pass-die KPI off by one (the classic "chart contradicts the oracle"
class — severity `blocker`, always):

```bash
sed -i "s/setText('summary-pass-dies', pass);/setText('summary-pass-dies', pass + 1);/" demo-app/wafer-viewer/viewer.js
```

### Step 2 — run the affected scenario; the collector fires

```bash
npx bddgen && npx playwright test --project=chromium --grep "summary tiles"
```

The scenario fails on the oracle comparison, and after the report the
collector announces the candidate:

```
Error: pass dies
Expected: 479
Received: 480
   at steps\demo\wafer-map.steps.ts:74

  1 failed

Bug candidates (1) — triage with /flake-triage or /bug-report, then file: npm run bug:sync
  · .probe\artifacts\bug-sync\candidates\3f0f9363394b.json
```

The candidate JSON already holds everything a developer needs (abridged):

```json
{
  "fingerprint": "3f0f9363394b",
  "scenario": "The summary tiles show the correct yield numbers",
  "tags": ["@demo", "@smoke", "@regression", "@wafermap", "..."],
  "failingStep": "Then the summary panel reports the oracle yield",
  "error": {
    "normalized": "error: pass dies expect(received).tobe(expected) // object.is equality expected: # received: #"
  },
  "attachments": [
    { "name": "screenshot", "path": "test-results/.../test-failed-1.png" },
    { "name": "video", "path": "test-results/.../video.webm" },
    { "name": "trace", "path": "test-results/.../trace.zip" }
  ],
  "environment": { "env": "local", "commit": "aafda4e", "os": "win32 10.0.26200", "ci": false },
  "occurrences": ["2026-07-16T17:21:08.014Z"],
  "classification": null,
  "severity": null,
  "jira": null
}
```

Re-running the same failure does NOT create a second candidate — the
fingerprint matches, so the existing file gains an occurrence
(`occurrences: 2`). That same identity survives different expected/actual
numbers, machines, and colored/plain output, because of error normalization.

### Step 3 — classify (this is /bug-report's job)

`/bug-report wafer-map-cluster-detection pass-die KPI contradicts oracle`
reproduces, writes the BUG-NN.md artifact, and sets the triage verdict in the
candidate. Wrong data on a KPI/chart is always `blocker`:

```json
"classification": "app-bug",
"severity": "blocker",
"triageNotes": "KPI tile contradicts the numerical oracle: app reports 480 pass dies, oracle computes 479 from the same golden CSV."
```

### Step 4 — file to Jira

```bash
npm run bug:sync                    # preview only
npm run bug:sync -- --live         # deliberate external write
```

Dry-run mode shows the exact ticket. Complete `JIRA_*` variables alone do not
file; `--live` is also required. Live mode creates or deduplicates the issue,
attaches approved evidence, and prints the key + URL:

```
Jira bug sync — 1 candidate(s), 1 classified app-bug

  DRY RUN (pass --live with complete HTTPS Jira credentials to file)
  would create: [E2E] The summary tiles show the correct yield numbers — Then the summary panel reports the oracle yield
    priority: Highest · labels: e2e-auto, fp-3f0f9363394b, found-automated, demo, smoke, regression, wafermap, feature-ClusterDetection, story-ClusterOverlay
    dedup key: fp-3f0f9363394b (open issue with this label → comment, not duplicate)
    attachments: test-results\...\test-failed-1.png · ...\video.webm · ...\error-context.md · ...\trace.zip
```

Unclassified candidates are HELD, not filed — the output says so explicitly
(`N held (unclassified or not app bugs — triage first)`).

### Step 5 — restore

```bash
git checkout -- demo-app/wafer-viewer/viewer.js
npx playwright test --project=chromium --grep "summary tiles"   # → 1 passed
```

## 4. Return pipeline: fix + RCA → test adjustment (Phase 2 — designed)

The inbound half closes the loop when the developer resolves the bug. It is
specified here and lands once the Jira token and the dev-team RCA agreement
are in place:

1. **RCA contract** — resolving an `e2e-auto` bug requires a structured RCA
   (Jira field or comment): _Root cause · What changed in the fix · Behavior
   change? (yes/no + what) · Suggested test impact_.
2. **Poller** — `scripts/rca-poll.ts` runs JQL
   `labels = e2e-auto AND statusCategory = Done AND labels != rca-processed`
   (nightly CI stage or on demand) and drops each resolved issue + RCA into
   `.probe/artifacts/bug-sync/inbox/`.
3. **`/rca-sync` skill** — reads the inbox and routes each RCA to one of
   three outcomes:
   - **Fix restores spec'd behavior** → re-run the affected scenario ×3,
     un-quarantine if quarantined, comment "verified fixed by `<scenario>`
     in run `<link>`" on the issue, label `rca-processed`.
   - **Intended behavior change** → draft script/manual-case updates as a
     **proposed diff — never auto-applied**; script changes go through Script
     Audit, manual-case updates go to AIO. (Same no-silent-self-healing
     stance as UI change detection: a tool that silently rewrites assertions
     will eventually codify a real bug as expected behavior.)
   - **Escape** (no test covered the broken path) → draft a new test-case
     proposal that enters a mini Case Forge → Script Forge cycle. Every escaped
     bug permanently strengthens the suite.
4. Every outcome is recorded in the feature ledger
   (`docs/qa/<feature>/LEDGER.md`), so gate reviews see the full lifecycle.

## 5. Operating notes

- Candidates and copied evidence live under `.probe/` (gitignored). CI archives
  `.probe/artifacts/**` before workspace cleanup; the permanent shared record
  is the archived build evidence, promoted BUG-NN/ledger entry, and Jira issue.
- The collector skips `@quarantine`/expected failures. A retry-then-pass creates
  a durable `flaky` candidate so CI cannot silently discard the occurrence;
  `/flake-triage` must classify it before any app-bug filing decision.
- Severity → Jira priority: `blocker→Highest · high→High · medium→Medium ·
low→Low` (team-managed projects without a priority field are handled — the
  filer retries without it).
- Fully unattended CI (headless classification gate + nightly RCA poll) is
  Phase 3 and rides on the Jenkins pipeline.
