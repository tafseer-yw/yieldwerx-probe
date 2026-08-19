# Changelog

All notable changes to YieldWerx PROBE are recorded here.

## 3.1.0 — 2026-08-19

**Two full tracks that share one requirement.** The Dev track gets a front (a
PRD skill) and a back (unit tests, migrations, styleguide, PR review), one skill
set targets many stacks by argument, and the QA track reaches three surfaces it
could not before: the desktop application, property-based API fuzzing, and
OWASP 2025 security.

### Shared

- **`/probe-spec` is now `track: shared`.** One `spec-analysis.md` per feature,
  jointly owned; whoever runs it second reads the existing analysis (the
  unqualified rerun already fails closed), and a requirement change goes through
  `--reconcile`, reporting downstream impact to both tracks. New policies D10
  (shared spec) and D9 (stack routing) in DEV-TRACK.md.
- **`/forge-prd`** — writes a PRD every stakeholder reads the same way: problem
  and cost, product-word build description, stable `US-NN` stories each with a
  plain-words explanation, open questions with recommended answers, and a Terms
  table. Lives in the configured PRDs home with a
  draft → in-review → signed-off **filename** lifecycle; sign-off is a recorded
  human decision, never implied. Enforced by `validate-prd.mjs` (CLI
  `probe validate-prd`, MCP `probe_validate_prd`), which shares the exact
  plain-language checker that guards `spec-analysis.md` — extracted to
  `scripts/lib/plain-language.mjs` so the two documents cannot drift into
  different languages.

### Stacks (`--stack`)

- Dev-track skills resolve stack facts — layers, conventions, commands, traps —
  from a **profile**, so one skill set serves any stack and adding a stack is a
  profile, never a new skill. New: the profile contract
  (`references/profiles/README.md`) and four profiles — `dotnet-legacy` (the
  shipped ASP.NET MVC 5 / EF6 / SQL Server / WinForms platform, from the
  knowledgebase handbook), `dotnet-modern` (**provisional** — direction only,
  no repository behind it yet), `node-ts-spa`, and `testcomplete-winforms`.
- New `stacks:` config key; `--stack` resolution fails closed (never guesses a
  stack).

### Dev track — design, build, review

- **`/forge-tech-design`** + `tech-designer` agent — the spec analysis becomes a
  stack-fitted design: layer map, data model with migration outline, API
  contract, tenancy/authorization/auditing/logging, testability obligations, a
  threat sketch (feeding OWASP A06), and ADR decision records. Refuses to design
  on open blocking questions.
- **`/build-feature`** gains `--stack` and `--layer backend|frontend|both`;
  backend-led runs emit the **FE handoff report** (endpoints, payloads, lookup
  names, field ids) so frontend work starts from a contract.
- **`/forge-unit-tests`** — the developer-owned coverage the spec routed to
  unit/integration level in `dev-handoff.md` (which nothing consumed before),
  with independently derived expected values.
- **`/forge-migration`** — safe, registered migrations under the rules that make
  them boring: never edit an applied migration, additive first, two-step
  NOT NULL, idempotent seeds, audited-table pairs.
- **`/sync-styleguide`** — implemented UI reconciled against the repository's own
  styleguide and tokens; the plugin never bundles a copy of anyone's design
  system.
- **`/review-pr`** — the opened pull request reviewed as its reviewer
  (`gh` / `az repos`), GO / NO-GO evidence, never a merge.
- **`/handoff`** — session-to-session continuity, facts from git and real
  verification output.
- **Four closing states** (`COMPLETE` / `COMPLETE_WITH_NOTES` / `BLOCKED` /
  `NEEDS_INFO`, the last always carrying a recommended default) as policy D12,
  applied across the dev skills. The `requirement-clarifier` now gives every
  open question a recommended answer.

### QA track — desktop, API, performance, security

- **Desktop (TestComplete).** `/desktop-recon` + agent surveys the WinForms app,
  harvests Name Mapping candidates, and reports every control with no
  developer-set `Name` as a testability gap (the desktop's `testid-gaps`).
  `/forge-desktop-scripts` + `testcomplete-scripter` agent imports the same
  `.feature` files into TestComplete's Scenarios item and binds **Python** step
  definitions — one case of record, two runners. The CI reality is encoded:
  TestComplete needs an **interactive session** (headless agents cannot run it),
  and only exit code **2** counts against the stability streak (3/4/127/1000/
  1001/−1 are environment findings).
  **`@desktop` is a surface tag, not a test level** — a behaviour reachable only
  through the desktop application is still `@testtype:e2e` or
  `@testtype:component` and carries `@desktop` alongside, exactly as `@visual`,
  `@a11y`, and `@api` ride alongside a level. The tag is what routes a scenario
  to TestComplete instead of Playwright.
  The profile carries an **operating model for a separate desktop team**: cases
  and ledger resolve from the QA repository's checkout (unresolvable paths are
  refused, never guessed), the `@automated` write-back is a cross-repository edit
  with an explicit no-write-access path, and two automations tagging one feature
  file is a named hazard with a resolution rule.
- **API fuzzing.** `/forge-api-tests` gains a `fuzz` layer (property-based
  generation from the OpenAPI schema — Schemathesis by default) and `--stack`.
- **Performance.** `/forge-performance-tests` sources its SLO and workload from
  the requirement's performance ACs by id, never an invented figure; adds
  `--stack`.
- **Security (OWASP Top 10:2025).** `/forge-security-tests` authors the four-plus
  categories a scanner cannot judge (access control, insecure design,
  authentication, logging), tagged `@owasp:ANN`. `/scan-security` +
  `security-analyst` agent drives the scannable categories through a **swappable
  tool contract** (ZAP, Schemathesis, OSV-Scanner/Trivy, Semgrep by default),
  maps findings to categories and the severity ladder, triages confirmed from
  noise, and routes confirmed findings to `/bug-report`. **Active scans require
  explicit target authorization and fail closed** — the same rule as a live AIO
  write. The coverage map is honest that no scanner covers the Top Ten.

### Housekeeping

- 31 → 42 skills, 13 → 17 agents.
- probe-lab's `probe.config.yaml`: `probeVersion` 2.13.0 → 3.1.0, the removed
  `governance.gates` block deleted, a `stacks: [node-ts-spa]` declaration added.

### Upgrading

See [MIGRATION.md](MIGRATION.md). No 3.0 behavior changed; everything here is
additive. Existing consumers gain the new skills on install and opt into
`--stack` by declaring `stacks:` in their config.

## 3.0.0 — 2026-08-18

**Every gate becomes a record of a human decision, and the four mechanisms that
existed to argue with computed verdicts are gone.**

A gate used to compute a `READY`/`NOT READY` verdict and block on it. That needed
a waiver system, an audit-bypass system, a PIN-authorized owner override, and a
hibernation mode — five mechanisms arguing with a fourth one nobody had asked
for. What was always doing the real work is the part that remains: a named human
reads the evidence, says they approve, and the decision is recorded with a
timestamp.

### Gates

- A gate now does four things: **assemble** an evidence digest of facts,
  **present** it, **record** the human's decision, **unlock** the next stage.
- The digest carries counts, coverage numbers, lint and run results, and a
  **Gaps and open items** section listing everything missing or failing. No
  verdict, no readiness stamp, no ✅/❌ checklist, no recommendation.
- The approval row names the human, their role, a `YYYY-MM-DD HH:MM` timestamp,
  what they said they reviewed, and the evidence link. **Any role may approve any
  gate** — no signer hierarchy.
- Approving with the listed gaps visible is a legitimate decision and is recorded
  as exactly that. Removing a gap from a digest to make a decision look cleaner is
  falsified evidence and remains the most serious failure in the process.
- Claude never writes an approval a human did not state. It may transcribe one
  they did.
- One block remains: `/forge-scripts` refuses until the ledger has a Design Gate
  approval row for the scope. It blocks on exactly one thing — whether a human has
  looked at the design.
- New authority: `references/governance/human-gates.md`.

### Removed

| Removed                                     | Replacement                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| `/yw:audit-cases` + `test-case-auditor`     | the Design Gate digest, the coverage report, Case Forge's self-check |
| `/yw:bypass-gate`                           | nothing — there is no waiver to record                          |
| `/yw:owner-bypass` + its CLI and receipts   | nothing — there is no computed blocker to override              |
| `references/governance/gate-hibernation.md` | `references/governance/human-gates.md`                          |
| `governance.gates` in `probe.config.yaml`   | —                                                               |
| the `waived` ledger status and waiver table | —                                                               |

`/yw:audit-scripts` survives as an **advisory** review: it holds no ledger row,
gates nothing, and needs no waiver. `/yw:green-run` and `/yw:gate-merge` no longer
require it. Its findings are reported into the Merge Gate digest for a human to
weigh.

Skills: 34 → 31. Agents: 14 → 13. Severity is now classification, not control
flow — nothing halts automatically, and a `blocker` a human knowingly approves
past is a recorded decision.

### Spec Probe writes plain language, and it is enforced

The rules existed as prose for four minor versions and drifted every time: the
analysis shortened the product's own control names, coined acronyms that exist
nowhere in the product, and restated one-line rules as architecture.
`validate-spec-analysis.mjs` now rejects each.

- **Labels are verbatim** — every control, screen, field, button, and status is
  written exactly as the source writes it. `Cluster Detection Mode` is never
  `cluster mode` and never `CDM`.
- **No invented acronyms** — one may appear only if the requirement itself uses it
  and a new required `## Terms` table cites where. Process ids, units, and file
  formats are exempt by a fixed list.
- **No abbreviations** — in summaries, plain-words lines, and Gherkin steps alike.
- **New required field: `**In plain words:**`** — one to three sentences per
  acceptance criterion for a reader with no domain knowledge. This is the answer
  to "someone outside the domain cannot read our specs".
- Summaries are capped at one sentence of twenty words.
- New reference: `skills/probe-spec/references/plain-language.md`.
- `--migrate-format` brings an existing analysis forward, adding both new fields
  without changing any meaning or invalidating downstream evidence.

### Case Forge designs API cases in every category

- Every category records an explicit **API disposition** alongside its visual one:
  `API candidates: <TC ids>` or `API: N/A — <specific reason>`. A generic `N/A` is
  a gap.
- For a category with a service surface, design across the dimensions —
  functional, negative, boundary, authorization, contract, workload — rather than
  one shallow case per endpoint.
- API scenarios go to `features/<slug>/<category>-api.feature`, beside the UI file.
- Expected values follow the unchanged authority rule, which matters more here
  because a requirement rarely states status codes: use the requirement's value,
  else cite `40-api-recon/api-inventory.md` as observed contract, else raise a
  `Q-NN`. Never invent a status code.
- Spec Probe's category table gains a **Service surface** column so Case Forge has
  something concrete to design against.
- `automation-plan.md` gains a **Target forge** column, so an API case cannot
  silently arrive in a Playwright cycle.
- API cases remain **repository-only** — the AIO exclusion is unchanged.

### Claude Desktop can run Case Sync

Every capability with an executable behind it was reachable only through a shell
command. Claude Desktop runs processes but gives the assistant no shell, so
`/yw:sync-cases` had no engine there at all, and the spec validator, Gherkin lint,
and coverage report were unreachable for the same reason.

- **New stdio MCP adapter** — `adapters/mcp/server.mjs`, dependency-free, declared
  in `plugin.json`, so installing the plugin is the whole setup. Tools:
  `aio_check`, `aio_whoami`, `aio_folders`, `aio_cases`, `aio_plan`, `aio_sync`,
  `probe_validate_spec`, `probe_lint_cases`, `probe_coverage`. Each spawns the
  same bundled script the CLI runs.
- **`aio_sync` carries its own confirmation.** The guard that asks before a live
  AIO write is a PreToolUse hook on the *Bash* tool; on the MCP path there is no
  Bash call, so it never fires. The tool refuses without `confirm: true`, and the
  adapter beneath it still refuses without a recorded human approval.
- **Case Sync is defined against verbs, not commands** — `check · explore · plan ·
  authorize · push · write back` — with three engines: CLI, MCP, and an export
  bundle when neither is available. `plan` is always free and writes nothing;
  `push` is doubly gated. An export bundle is recorded as `blocked`, never `done`.
- The skill states which engine it selected. A quiet fallback looks exactly like a
  sync that worked.
- New: `probe mcp-server` CLI entry point,
  `references/integrations/case-management.md` (the adapter contract), and a
  **Hosts without a shell** section in `references/configuration.md` covering the
  validator, lint, and coverage.
- New test: `scripts/test-mcp-server.mjs` pins the handshake, the tool inventory,
  real script execution, and the live-write refusal.

### Caught in review, before release

Seven defects found reviewing this change against itself. The first is the one
worth knowing about:

- **A ledger nobody had approved could authorize a live production push.** The
  pre-3.0 compatibility fallback read the stage table's Design Gate status — but a
  3.0 ledger *also* carries `DESIGN GATE | … | done`, which the gate skill sets
  when it records an approval. A ledger built straight from the new template, with
  an empty Gate approvals table, therefore reported `Design Gate authorized: yes`.
  The fallback now speaks only when the approvals table is absent entirely, and
  six executed regression cases in `test-aio-payload.mjs` pin it.
- The plain-language checker flagged Gherkin placeholders (`<fileType>`) as
  invented acronyms, with no way to satisfy the error. Placeholders are structure,
  not prose, and are now excluded.
- `plain-language.md` Rule 3 listed abbreviations the checker did not reject.
  The list and the code now match, and a `## Terms` row clears a short form the
  source itself uses.
- The MCP adapter spawned configured commands with `shell: false`, so `npm run …`
  — what the shipped example configs use — could not launch on Windows, the main
  platform for the no-shell host the adapter exists to serve.
- An unexpanded `${CLAUDE_PROJECT_DIR}` is a truthy string, so the fallback to the
  working directory never fired and every tool failed with an `ENOENT` that blamed
  Node. The path is now validated as a real directory first.
- A regex-escape helper in the adapter escaped nothing (a string-context pattern
  in a regex literal). Latent, now correct.
- One MCP test assertion could never fail. It now compares every emitted line, and
  proves it can fail.

### Upgrading

See [MIGRATION.md](MIGRATION.md). Existing ledgers are **not** rewritten — old
waiver, hibernation, and bypass rows stay as the record of what was decided under
the process in force at the time. `/yw:sync-cases` and `/yw:forge-scripts` accept a
pre-3.0 stage-row Design Gate status of `approved`, `signed`, or `done`, and
deliberately reject `bypassed`, `waived`, and `hibernated`.

## 2.13.2 — 2026-08-17

**Removes an unenforced hard dependency and moves the knowledgebase marketplace
to public GitHub.** Housekeeping and a reachability fix. It does **not** fix
`/yw:*` answering `Unknown command`; that defect remains open.

`plugin.json` required `yieldwerx-knowledgebase@yieldwerx-company`. The
documented behaviour is that Claude Code disables a plugin whose declared
dependency is unsatisfied (`dependency-unsatisfied`), which made this a plausible
cause of the whole plugin failing to respond to typed commands. **Direct testing
did not support that.** With the knowledgebase uninstalled, and again with it
merely disabled, `yw` stayed `enabled=true` with `errors=null` and the loader
still registered all 34 skills; `claude plugin disable` on the knowledgebase
succeeded instead of being refused as a depended-on plugin. The dependency was
not being enforced, so removing it is hygiene, not a fix.

It is still the right removal. Only `ask-yieldwerx` and
`update-yieldwerx-knowledge` consult the knowledgebase, and both already state
when it is missing or disabled rather than guessing. The other 32 skills never
touch it, so a manifest dependency capable of disabling all 34 is the wrong trade.

- Removed the `dependencies` array from `plugin.json`. The knowledgebase is now a
  documented **optional prerequisite**, installed separately.
- Removed `allowCrossMarketplaceDependenciesOn` from `marketplace.json`. With no
  dependencies declared it was dead configuration, and an allowlist naming
  `yieldwerx-company` reads as sanction for re-adding it.
- Repository validation now **fails if either returns**, replacing the guards
  that previously _required_ both.
- Documented the **public GitHub source** for the knowledgebase marketplace. It
  is published to both an internal Azure DevOps repository and
  `https://github.com/tafseer-yw/yieldwerx-knowledgebase.git`, both declaring the
  same marketplace name, so every `@yieldwerx-company` reference resolves
  identically — only reachability differs. Re-point steps are in `MIGRATION.md`.
- No skill file changed.

Eliminated so far as causes of `Unknown command`: the 2.13.0 command shims (which
caused their own outage), invalid YAML in the dev-track `graph:` blocks
(disproved by a strict YAML 1.2 parse of all 34 front-matter blocks), and this
dependency. The host's slash-command resolver is the remaining lead.

## 2.13.1 — 2026-08-17

**Reverts 2.13.0. That release stopped the plugin from registering anything at
all in Claude Desktop — no skills and no commands.** Anyone who synced 2.13.0
must update to 2.13.1.

2.13.0 added a `commands/<name>.md` dispatch shim per skill, on the theory that
Claude Code builds the `/` menu from `skills/` while Claude Desktop builds it
from `commands/`. The theory was wrong. The loader merges both directories into
a single registry:

- `claude plugin details yw@yieldwerx` reported **68 skills for 34 entry
  points** — every name registered twice, once from each directory. The
  duplicate-name collision took the whole plugin's registration down in Desktop.
- Always-on context grew from ~5,478 to ~9,570 tokens, a 75% increase charged to
  every session.

- Removed `plugins/yieldwerx-probe/commands/` and
  `scripts/generate-commands.mjs`, and dropped the `npm run commands` script.
- Repository validation now **fails if a `commands/` directory reappears**,
  carrying the reason, so the idea cannot be retried as though untested.
- `skills/` alone is the correct layout. Verify any change with
  `claude plugin details yw@yieldwerx` and confirm the skill count matches the
  number of directories under `skills/`.

Ruled out while diagnosing: the `?`-suffixed optional entries in the dev-track
`graph:` flow sequences (`artifact:10-spec/spec-analysis.md?`) were reported as
invalid YAML. They are not. All 34 `SKILL.md` front-matter blocks parse cleanly
under a strict YAML 1.2 parser, and the `?` entries parse as the intended plain
string scalars. No skill front-matter was changed.

The original complaint — `/yw:*` typed in Claude Desktop answering
`Unknown command` — is **not fixed by this release** and is back to being open.
Skill invocation works, so asking for a stage in plain language ("run Spec Probe
for YWPD-22226") remains the reliable path in Desktop.

## 2.13.0 — 2026-08-17 — BROKEN, DO NOT USE

**Fixed: `/yw:*` commands returned `Unknown command` in Claude Desktop even
though the plugin was installed and its skills were loaded.** Every public entry
point was authored only as `skills/<name>/SKILL.md`. Claude Code resolves those
into the `/` menu, but Claude Desktop builds its menu from a plugin's
`commands/` directory, which the hosted payload did not have. The skills still
loaded for model invocation and appeared in Desktop's Skills panel — so the
plugin looked correctly installed — while every typed command failed to resolve.

- Added a generated `commands/<name>.md` dispatch shim for all 34 skills. A shim
  repeats its skill's `description` and `argument-hint` so autocomplete is
  identical, then points at the `SKILL.md` and stops.
- Shims carry no process of their own. Because they delegate rather than
  duplicate, it does not matter which entry a host resolves first, and
  `PROBE-PROCESS.md` and the skills remain the only process authority.
- Added `npm run commands` (`scripts/generate-commands.mjs`) to regenerate the
  shims from the skills, including removal of orphans.
- Repository validation now fails on a missing, orphaned, or drifted shim, on a
  shim that stops delegating or drops `$ARGUMENTS`, and on a shim that grows
  `## Why`/`## What`/`## When`/`## Where`/`## How` process text. The validator
  and the generator share one front-matter reader so drift cannot hide from the
  check meant to catch it.
- Workaround for anyone on 2.12.0 or earlier in Desktop: ask for the stage in
  plain language ("run Spec Probe for YWPD-22226") — model invocation of the
  skills was never affected.

## 2.12.0 — 2026-08-10

**Allrounders can now explicitly bypass Case Audit, Script Audit, or both audit
gates without falsifying an audit PASS.** `/yw:bypass-gate` accepts
`case-audit`, `script-audit`, and `audits` alongside its existing gate scopes.

- `audits` expands to separate Case Audit and Script Audit waiver records.
- `all` deliberately remains Design, Merge, and Ops gates only; audit and gate
  groups never imply each other.
- A Script Audit waiver is bound to the exact TC inventory and
  commit/file-hash manifest. Any material script change makes it stale.
- Stability Run and Merge Gate accept a current exact Script Audit waiver as
  the audit prerequisite while preserving the real verdict, findings, missing
  review, and residual risk.
- Script Audit bypass does not bypass Merge Gate. If the assembled Merge Gate
  is still `NOT READY`, progressing past it requires its own explicit waiver.
- Tafseer Haider's committed allrounder identity is sufficient authority for
  these scopes; the owner-PIN flow remains reserved for owner-only overrides.

## 2.11.0 — 2026-08-10

**Gates can be hibernated for an evaluation period — without pretending they
passed.** A team adopting PROBE needs to run it end to end before agreeing to be
bound by it. During that trial a gate that blocks delivery is not governance, it
is an adoption barrier, and the usual outcome is that the team abandons the
process rather than the shipping. Deleting the gate checks is the wrong fix,
because then nothing records what shipped un-gated and the evaluation produces no
evidence about whether the gates were worth having.

Declared per repository in `probe.config.yaml`:

```yaml
governance:
  gates:
    mode: hibernated
    scope: [design, merge, ops]
    authorizedBy: { name: ..., email: ..., role: ... }
    reason: ...
    since: 2026-08-10
    until: null # or a date; an expired hibernation is not honoured
```

### What it does

The gate still runs, still assembles evidence, and still reports `READY` or
`NOT READY` with every failing checklist item intact. Its decision line reads
`HIBERNATED — evidence assembled, not signed`. **One thing changes: whether that
verdict stops work.** `/forge-scripts` and `/testops-promote` accept the
hibernation record in place of the approval they normally demand, and record the
gate's real readiness verdict when they do.

### What it does not do

Five things stay live, and a skill that suspends any of them has misread the
policy:

- **the severity ladder** — a `blocker` still halts, and wrong business data is
  still `blocker`. Suspending this would make the evaluation worthless, because
  the team would never see PROBE catch anything;
- **Case Audit and Script Audit verdicts** — hibernation is not an audit waiver;
  `/bypass-gate` and `/owner-bypass` remain the only routes, still per-scope;
- **the traceability chain**;
- **external-write authorization** — a live AIO sync, a Jira filing, and a push
  each still need explicit approval;
- **the repository's own branch protection and merge controls**, which PROBE
  does not own and never waives.

**No gate is ever reported as approved.** A hibernated gate is `HIBERNATED`,
never `APPROVED`, `PASSED`, or `SIGNED`; the Ops Gate outcome becomes
`Done — Ops Gate hibernated`, never plain `Done`. Rendering hibernation as
approval is falsified evidence and is `blocker` under the ladder.

### The debt list

Every stage that proceeds under hibernation writes a ledger row carrying the
authorizer and the gate's real readiness verdict. When gates resume, **those
rows are the gate-debt list** — each is then signed, explicitly bypassed, or
remediated. A gate that said `NOT READY` under hibernation does not become
`READY` because time passed.

### Also

- New policy **P17 — Gates may be hibernated, never faked** in PROBE-PROCESS,
  with the full contract in `references/governance/gate-hibernation.md`.
- `config/probe-config.schema.json` gains the `governance.gates` block.
  `mode: hibernated` **requires** `scope`, `authorizedBy`, `reason` and `since`;
  a hibernation with no named human is not a governance decision and is rejected.
- The ledger template gains a hibernation table, with signature fields left
  empty and unmarked so no signature is implied.
- Repository validation asserts the properties that keep hibernation from
  decaying into a silent waiver, and forbids rendering a hibernated gate as
  approval.
- **The config parser now supports flow sequences, flow mappings, and scalar
  block sequences** (`scope: [a, b]`, `authorizedBy: { name: ... }`, and a
  conventional multi-line `scope:` list). `governance.gates.scope` is the first
  array-valued key in the schema, and the minimal YAML parser previously read a
  flow sequence as a string and rejected a block sequence outright. Caught by
  `probe doctor` against a real consumer config, and now covered by `test-cli`
  for all three accepted forms, expired hibernation, and anonymous rejection.

## 2.10.0 — 2026-08-10

**PROBE gains a development track.** Until now PROBE governed how a feature is
tested and said nothing about how it is built, so the two drifted apart at
exactly the seam where the expensive findings live: a control ships with no
stable identifier and UI Recon discovers it a quarter later; a service accepts
an enum its own API document does not declare and API Recon finds the
contradiction after a hundred cases were written against the document; a defect
is filed, fixed somewhere else, and no evidence ever returns.

Seven new `yw:*` skills, four new agents, one process authority, one stack
profile. The QA track is unchanged — no existing skill, agent, gate, policy or
artifact path was modified.

**The development track is gate-independent (policy D8).** No development skill
checks a ledger, waits on the Design, Merge, or Ops Gate, or requires a QA
artifact to exist. Every one of them runs on a repository that has never used
PROBE's QA process; where a QA artifact is present it is consumed as better
input, never as a precondition. This is deliberate — PROBE's QA process is a
QA-team-owned gating discipline, and coupling a developer's ability to build to
a signature that team owns would make the track unusable. Repository validation
enforces it from both directions: each skill must state its independence, and
none may contain the QA track's gate-refusal phrasings.

### New skills (development track)

- **`/yw:scaffold-app`** — stand up an application whose QA contracts exist from
  the first commit: a served API document, enforced roles, a queryable
  datastore, deterministic seed and reset, and a declared selector policy,
  proven by one trivial vertical slice. Refuses over existing application code.
- **`/yw:build-feature`** — approved requirement to verified capability.
  Clarify without assuming, design onto the repository's real layers, split into
  bounded tasks with non-overlapping files, implement whole journeys, and loop
  on verbatim failures until green.
- **`/yw:revise-feature`** — change existing behaviour with its current state
  inventoried first, compatibility preserved unless a break is authorized, and
  stored data migrated. Emits the downstream-invalidation list.
- **`/yw:fix-defect`** — closes the loop from `/yw:bug-report`. The failing test
  comes first and its failure is recorded verbatim; the mechanism is stated with
  citations before any edit; the candidate is never closed from here.
- **`/yw:seed-testability`** — turns a UI Recon or API Recon gap list into
  shipped selector and API-document contracts. Changes observability, never
  behaviour.
- **`/yw:review-code`** — independent adversarial review of _application_ code
  with a `GO`/`NO-GO` verdict, closing the asymmetry where `/yw:audit-scripts`
  reviewed test code and nothing reviewed the code it tests.
- **`/yw:ship-change`** — hygiene, commits that say why, and a pull-request body
  carrying the verification evidence, the review verdict, and the list of QA
  artifacts the change makes stale.

### New agents

- **`requirement-clarifier`** — refuses to invent. Every dimension is labelled
  `stated`, `verified-in-code`, `proposed`, or `OPEN QUESTION`, with citations.
- **`build-verifier`** — runs the configured verification set and returns
  failures verbatim. Reports a change with an unmet observability obligation as
  `red` even when every command passed.
- **`code-reviewer`** — adversarial application-code review across correctness,
  data integrity, security, error handling, observability and determinism.
  Routes automation to `script-auditor`.
- **`testability-scout`** — read-only inventory of what the QA track will not be
  able to see: missing identifiers, value-named handles, API-document drift,
  unreadable results, non-determinism.

### New authority and profile

- **`references/process/DEV-TRACK.md`** — the development track's process
  authority and its nine standing policies (D1–D9). Names the four optional
  seams where the tracks may meet, states that neither edits the other's
  artifacts, and fixes gate-independence as policy D8.
- **`references/profiles/node-ts-spa/`** — a stack profile for a Node/TypeScript
  service with a documented API and a single-page frontend: a selector policy
  with a gap-ranking rubric, service conventions covering API-document parity,
  authorization, determinism and readable results, and the traps recorded from
  live YieldWerx recon passes.

### Composition edges are now declared and validated

Every development-track skill and agent declares its edges in a `graph:`
frontmatter block — `consumes`, `produces`, `next`, `delegates`, `used_by`.
Repository validation rejects an unknown relation, an unknown node-kind prefix,
and any `skill:` or `agent:` edge pointing at something this repository does not
ship, so a rename cannot leave a dangling reference behind. The QA track's
composition remains documented in PROBE-PROCESS and PROBE-QUICKREF; backfilling
its frontmatter is a deliberate follow-up.

## 2.9.3 — 2026-08-10

- Added the human-readable plugin name **yieldWerx PROBE** for Claude Desktop
  while retaining `yw` as the stable plugin identifier and short command
  namespace.

## 2.9.2 — 2026-08-05

- **Claude Desktop marketplace sync is now supported.** The portable npm CLI
  entry point moved to the repository-level `bin/` directory so the hosted
  plugin payload no longer contains a top-level executable directory that
  Claude Desktop rejects. The published `probe` command remains unchanged, and
  repository validation prevents the incompatible plugin layout from returning.
- **Fixed the repository guard that was enforcing known-broken AIO payload
  shapes.** `validate-repository.mjs` required the literal strings
  `tags: aioTags(cfg, scenario)` and `labels: aioLabels(cfg, scenario)` — the
  flat tag array AIO silently discards, and a `labels` field that does not exist
  in `CaseFullDetails` at all. Any correct fix therefore failed `npm test`, so
  correctness was repeatedly reverted to keep the build green. This is the root
  cause of the same three defects being rediscovered across three pins.
- Added `forbidContent()` and asserted the live-API payload contracts
  (`/detail`, `datasetParameters`, `dataSets`, `tag: { ID }`, `createOrGetTags`,
  429 backoff) so a re-pin cannot silently drop them again. Confirmed the new
  guard rejects the 2.9.1 adapter, which was missing all six markers.
- **Update route fixed:** `updateTestCase` is
  `PUT .../testcase/{caseKeyOrId}/detail`. Without `/detail` AIO answers 404 for
  every case whether or not it exists, which is indistinguishable from a deleted
  record.
- **Outline `Examples:` no longer destroyed on update.** `PUT .../detail`
  replaces the whole case body, so a payload omitting `datasetParameters` +
  `dataSets` deletes the data sets of every Outline it touches. Both halves are
  now always sent; `dataSets` alone is accepted and discarded.
- **Updates no longer clear unmanaged case metadata.** Because `PUT .../detail`
  replaces the whole body, a payload built from scratch silently wiped every
  writable field the sync does not set — `precondition`, `priority`,
  `jiraComponentIDs`, `jiraReleaseIDs`, `estimatedEffort`, `automationStatus`,
  `jiraRequirementIDs` — including values a human entered in the AIO UI. An
  update now reads the case first (`?fetchDataSets=true`, or the read itself
  would drop the data sets), overlays only the fields sync owns, and strips the
  read-only fields AIO returns on GET but rejects on write
  (`WRITABLE_CASE_FIELDS` / `writableCaseDetails`, adopted from the unmerged
  `wip/aio-casetype-and-tags`, plus `aioCaseUrl` as a testable URL builder).
- Added `sanity` to the pushed tag whitelist. The three execution tiers are a
  nested set (smoke ⊆ sanity ⊆ regression); a tier absent from the whitelist is
  dropped from the push, so the tag exists in the corpus but cannot be filtered
  in AIO — indistinguishable from never having been applied. Guarded.
- Stopped pushing `functional` as a tag. AIO already expresses it as the case
  **Type** (`{ID: 9, name: "Functional"}`, set from `@testtype:`), so a tag of
  the same name duplicated a built-in field and read as a second, conflicting
  classification. `@positive`/`@negative`/`@edge` still push: they
  sub-classify a functional test and have no AIO Type equivalent.
- **Tags now persist:** `tags` is `CaseTag[]` = `[{ tag: { ID } }]`. Names are
  resolved (and created when absent) through `POST /project/{id}/tag` first,
  because referencing an unknown tag by name returns 500 and a flat
  `[{ name }]` returns 200 while storing nothing. Resolution falls back to
  case-insensitive matching so an existing `Regression` is reused rather than
  duplicated.
- **`@testtype:` now reaches AIO as `Type`** (a `CaseType` lookup object)
  instead of the non-existent `labels` field; `component`/`e2e`/`contract` map
  to `Functional`, other levels map directly, overridable via
  `defaults.typeMap`.
- **Bulk pushes survive throttling:** 429 and 5xx retry with exponential
  backoff honouring `Retry-After`, instead of aborting a run half-applied.
- **Fixed a write-back that corrupted traceability.** The key was written by a
  greedy `[^\n]*/` match, so the unsynced placeholder
  `(AIO key pending /yw:sync-cases)` — which contains a slash — became
  `(AIO key pending /YWPD-TC-1234:sync-cases)`. That line no longer parses as a
  key, so the scenario was created again as a duplicate on every later sync.
  The traceability comment's fields are now rebuilt rather than pattern-matched.
- Category values are sent as `customFields [{name,value}]` when
  `defaults.categoryCustomField` names an existing AIO custom field; unset sends
  nothing, since an unknown custom-field name is rejected.
- Plan table columns now report only fields the push actually sends (Tags, Type,
  Category) — it previously advertised a Labels column that AIO discarded.

## 2.9.1 — 2026-08-05

- Added computed scenario tags and test-type labels to live AIO create/update
  payloads so live sync matches the dry-run plan.
- Excluded `@retired` scenarios from AIO sync, preserving superseded records and
  preventing reassigned AIO keys from being overwritten later in the same run.
- Scoped feature-level Design Gate authorization to the current ledger stage
  row so historical or superseded approval text cannot authorize a live push.
- Added repository validation guards for the retired-case, row-scoped gate, and
  live tag/label payload contracts.

## 2.9.0 — 2026-08-05

- Added `/yw:execute-cases` for one-browser Playwright MCP-assisted execution
  with isolated cases, exact Gherkin-step results, and shared failure evidence.
- Added UI-led `--with-case-execution` so UI Recon, API Recon, and assisted
  execution can share one coordinated browser walk and separate artifacts.
- Added a 27-skill argument and tandem guide with selectors, handoffs, recipes,
  and unsafe combinations.
- Upgraded Bug Report, Flake Triage, and Exploratory Run to consume the same
  redacted failure packet while keeping classification separate from confirmed,
  suspected, or unknown root cause.

## 2.8.0 — 2026-08-04

- Added `/yw:api-recon` to reconcile Swagger/OpenAPI with sanitized live
  traffic, payloads, authentication, dependencies, and contract drift.
- Added `/yw:forge-api-tests` for typed functional, contract, workflow,
  security-baseline, deterministic resiliency, and UI-interception automation.
- Added `/yw:forge-performance-tests` for guarded k6 smoke, load, spike,
  stress, and endurance workloads with approved SLOs and cleanup.
- Made observable API performance a QA-owned `@testtype:performance` level
  implemented by k6 rather than Playwright step definitions.
- Excluded `@api`, API/contract, and performance scenarios/results from Jira
  AIO before validation, remote writes, key write-back, or result linkage.
- Added sanitized UI network observations and strengthened API/performance
  routing across Case Forge, Script Forge, audits, gates, and TestOps.

## 2.7.1 — 2026-08-03

- Renamed the PROBE expansion to **Plan · Review · Observe · Build · Evaluate**
  ("Test with purpose. Release with proof."), replacing "Process for
  Review-gated Orchestrated BDD Engineering".
- Added a mapping from each of the five words to the named stages it covers, so
  the expansion describes real activities rather than serving as a mnemonic.
- Documentation only: no stage, gate, policy, severity, skill, agent, CLI
  command, or identifier changed. Consumers need no migration beyond the
  version pin.

## 2.7.0 — 2026-07-31

- Added `/yw:bypass-gate` for explicit allrounder bypass of the Design,
  Merge, Ops, or all applicable PROBE gates.
- Kept bypassed gate evidence honest: the report remains `READY`, `NOT READY`,
  or `not assembled`; the human decision is recorded separately as
  `bypassed`.
- Updated Case Sync, UI Recon, Exploratory Run, Script Forge, the AIO adapter,
  and TestOps Promotion to accept only the exact recorded gate-bypass scope.
- Made `bypass all gates` expand to separate Design, Merge, and Ops decisions
  and waiver rows.
- Kept stage/audit waivers, repository merges, external-system permissions,
  and security controls outside an ordinary gate bypass.

## 2.6.0 — 2026-07-31

- Allowed a named QA Lead or Automation Engineer allrounder to explicitly
  bypass a missing, blocked, or failed Case Audit for an exact feature or
  category while preserving findings and residual risk.
- Declared Tafseer Haider (`tafseer.haider@yieldwerx.com`) as PROBE Owner and
  allrounder with authority to waive any exact PROBE governance item.
- Added `/yw:owner-bypass` and the PIN-protected `probe owner-bypass` CLI.
  The PIN and generated signing key stay in the user's environment or
  gitignored `.env`; Claude receives only a short-lived, signed,
  scope-specific receipt.
- Added receipt integrity, expiry, one-time consumption, and regression tests.
- Kept OS/tool permissions, external authorization, secret handling, and
  company security controls outside PROBE override authority.

## 2.5.1 — 2026-07-30

- Stopped the read-only AIO access summary from printing any part of the
  personal API token.
- Kept the useful access diagnostics—API base, project, Jira project id, and
  permission level—without exposing credential characters.

## 2.5.0 — 2026-07-30

- Simplified Design Gate approval for QA Lead and Automation Engineer
  allrounders.
- Allowed Claude to transcribe a named allrounder's direct approval into the
  ready gate report and ledger, including the current date, confirmed
  `@auto:now` set, stage status, and standard solo-allrounder waiver.
- Kept the decision human-owned: Claude cannot approve its own report, accept
  a non-allrounder's shortcut, or approve a `NOT READY` gate.
- Left Domain Test Analyst, Merge Gate, and Ops Gate signing behavior
  unchanged.

## 2.4.0 — 2026-07-30

- Made the provided PRD/story/specification package the sole feature
  requirement source of truth for Spec Probe.
- Limited knowledgebase use to YieldWerx terminology, modules, and business
  context; it cannot create, complete, resolve, or override a requirement.
- Required `AC`, `AMB`, and `OOS` sources to cite the provided requirement,
  while recording knowledge separately as reference context only.
- Added validator coverage that rejects knowledgebase or implementation
  references used as requirement authority.

## 2.3.0 — 2026-07-30

- Added `probe-spec --migrate-format` for presentation-only conversion of an
  existing spec analysis without changing meaning or downstream evidence.
- Added `probe-spec --reconcile` for source-based updates that preserve stable
  IDs, classify changes, and route substantive case work to Update Cases.
- Added the validated `10-spec/spec-reconciliation.md` evidence artifact with
  source hashes, per-item changes, downstream impact, and validation results.
- Made unqualified Spec Probe reruns fail closed when an analysis already
  exists.

## 2.2.0 — 2026-07-30

- Required every active acceptance criterion to start with
  `**Summary:** Verify that ...`.
- Required both Workflow and Simple Rule acceptance criteria to use fenced
  Given/When/Then Gherkin.
- Kept Simple Rule outcomes direct by requiring `must` or `must not`.
- Updated the Spec Probe validator, fixtures, tests, examples, and migration
  guidance for the new structure.

## 2.1.0 — 2026-07-29

- Required every selected Case Forge category to record visual candidates or a
  specific visual `N/A`, including named cross-category deferrals.
- Strengthened Case Audit so missing or unsupported visual dispositions block
  the Design Gate.
- Added an explicit Script Forge contract for named baselines, approved masks,
  deterministic visual runners, comparison commands, and visual evidence.
- Added repository checks that keep the visual design and scripting contracts
  present in future releases.

## 2.0.0 — 2026-07-29

- Changed the public Claude skill namespace from
  `yieldwerx-probe:<skill>` to the shorter `yw:<skill>`.
- Added marketplace migration metadata from `yieldwerx-probe` to `yw`.
- Added `yw:ask-yieldwerx` and `yw:update-yieldwerx-knowledge` adapters.
- Declared the independently versioned YieldWerx knowledgebase plugin as a
  cross-marketplace dependency instead of copying its knowledge.
- Updated PROBE Doctor and consumer examples for the `yw` plugin identity.

## 1.6.1 — 2026-07-29

- Fixed the portable coverage command so it runs correctly as an ES module,
  and added an end-to-end CLI regression test for its Markdown and JSON output.
- Fixed `probe doctor` on Windows installations that expose `claude.exe`
  instead of a command wrapper.

## 1.6.0 — 2026-07-29

- Added a dependency-free `probe` CLI for configuration checks, Spec Probe
  validation, procedural Gherkin lint, requirements coverage, and AIO
  operations.
- Added `probe doctor` to verify consumer paths, project plugin settings, and
  installed plugin versions before a workflow starts.
- Replaced copied product knowledge with a strict, versioned call to
  `yieldwerx-knowledgebase:ask-yieldwerx`.
- Added a fail-closed knowledge contract, source precedence, and simple source
  citations for QA artifacts.
- Made compatibility-profile loading explicit because Claude plugin reference
  files do not load automatically.
- Added a portable configuration parser, schema checks, CLI tests, package
  contents, migration guidance, and release documentation.
- Removed third-party runtime dependencies from the AIO adapter.

## 1.5.0 — 2026-07-29

- Added Workflow acceptance criteria using simple Given/When/Then wording.
- Added Simple Rule acceptance criteria using `must`/`must not` checklists.
- Kept the AC index stable for coverage and traceability.
- Replaced technical spec-analysis headings and columns with QA-friendly words.
- Added checks for missing Given/When/Then steps, weak rule wording, vague
  words, duplicate definitions, and missing category links.
- Added tests for a valid hybrid spec, a Workflow missing Then, and a weak rule.
- Updated Case Forge and its agents so requirement-level ACs are expanded into
  detailed procedural cases instead of copied.

## 1.4.1 — 2026-07-29

- Added skill-specific Why, What, When, Where, and How sections to every
  workflow skill.
- Added a complete 5W1H skill catalog to the repository README.
- Added validation that prevents skills from omitting the five sections.

## 1.4.0 — 2026-07-29

- Extracted PROBE from the YieldWerx Playwright BDD boilerplate.
- Added the optional Implementation Probe stage.
- Preserved 19 workflow skills and 10 operational specialist agents.
- Added a Claude Code plugin marketplace and consumer configuration contract.
- Retained Playwright BDD, AIO, Jenkins and Plotly behavior as compatibility
  profiles rather than mandatory core assumptions.
- Added repository validation and Azure Pipeline scaffolding.
