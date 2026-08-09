# Automation prioritization & pacing

How the framework decides **which test cases to automate now vs. later** and
**how fast to automate** — so automation sets a deliberate, sustainable pace
instead of trying to script everything the day cases are written. Authority for
PROBE policy **P8**; the orthogonal lifecycle contract is policy **P9**. The
concrete rubric the `test-case-designer` agent applies lives here.

Everything is eventually automated. Prioritization is about **sequencing**, not
exclusion: cases held back are covered by the PROBE Exploratory Run until the
feature stabilizes, then a later Script Forge cycle adds `@automated` without
removing their permanent `@manual` tag or re-authoring the scenario.

## The three artifacts this touches

- **`20-cases/automation-plan.md`** — produced in Case Forge by `/forge-cases`: per
  scenario effort points + candidacy score + tier, a per-category rollup, and a
  suggested day-by-day schedule.
- **Scenario tags** — every scenario carries exactly one candidacy tag:
  `@auto:now` · `@auto:next` · `@auto:later`.
- **Lifecycle tags** — every designed scenario permanently carries `@manual`;
  runnable implementations additionally carry `@automated`. These tags are
  cumulative, not alternatives.
- **The ledger** — records the human-confirmed `@auto:now` set (confirmed at the
  Design Gate).

## Effort points (automation cost)

A story-point-style estimate of how much work a scenario is to automate. Start
at 1, add, round to the nearest of **{1, 2, 3, 5, 8}**:

| Add | When                                                 |
| --- | ---------------------------------------------------- |
| +1  | a new locator/testId is required                     |
| +2  | a new page/component object is needed                |
| +2  | a new `src/plotly` chart contract/accessor is needed |
| +2  | a new oracle calculation is needed                   |
| +1  | a new wafer data shape must be generated             |
| +2  | an async rule-engine / DB-layer flow is involved     |

Effort points feed both the candidacy score (cost dimension) and the pace.

## Automation Candidacy Score (ACS)

Score each dimension 1–5 (5 favors automating now), then judge the tier. This
is a **decision aid, not an algorithm** — the human signer confirms the set.

| Dimension                    | 5 (now)                     | 1 (later)                           |
| ---------------------------- | --------------------------- | ----------------------------------- |
| Business / wrong-data risk   | wrong yield shown to users  | cosmetic                            |
| Feature stability            | behavior settled            | still churning in dev               |
| Determinism / automatability | pure data-layer assertion   | timing/animation-heavy, flaky-prone |
| Regression value / frequency | runs every PR, breaks often | one-off check                       |
| Cost (inverse of effort)     | 1–2 effort points           | 8 effort points                     |

> Note on tokens: naming avoids `P1/P2/P3` — those are **case priority**
> (critical/core/edge) and **PROBE policies**. Candidacy is a separate axis.

### Tiers

- **`@auto:now`** — high risk + stable + automatable at reasonable cost. The set
  Script Forge implements and tags `@automated` this cycle. Confirmed by the
  Design Gate signer.
- **`@auto:next`** — valuable but higher cost, or needs one stabilization pass;
  scheduled for the following cycle.
- **`@auto:later`** — low regression value, or the feature is still churning, or
  it is cheaper to cover by exploratory/manual testing until it settles.

A wrong-data-risk scenario should almost never be `@auto:later`; the case
auditor flags that at `high`.

## Pacing (scripts per day)

1. Sum the effort points of the `@auto:now` scenarios.
2. Divide by the team's **sustainable rate** — default **5 points/day** (tune
   per team; state the assumption in the plan).
3. Schedule P1/wrong-data-risk scenarios first; spread the rest across days.

Example: 6 `@auto:now` scenarios totalling 14 points at 5/day ≈ a 3-day
automation plan, not "automate all 18 designed scenarios at once."

## The human gate

The designer **recommends** tiers; a human **confirms** the `@auto:now` set at
the Design Gate. `/gate-design` surfaces the plan and adds a checklist line for
it; `/forge-scripts` adds `@automated` only to the confirmed runnable set. The
rest remain manual-only — effective tags include `@manual` but not
`@automated`, including inherited Feature/Rule tags — until successive cycles
automate them.

Ops Gate requires an exact manual-only count of zero. Any exception must be a
narrow human-signed waiver naming exact `TC-*` ids, rationale, owner,
expiry/backfill date, and retained manual coverage; a percentage waiver is not
valid. See [PROBE-PROCESS.md](process/PROBE-PROCESS.md) §6 P8–P9.
