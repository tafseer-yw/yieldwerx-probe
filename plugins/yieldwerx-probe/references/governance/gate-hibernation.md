# Gate hibernation

The contract for suspending PROBE's human-signed gates in a consumer repository
without pretending they passed. Authority for the behaviour every gate skill and
every gate-checking skill must follow. Declared in `probe.config.yaml` under
`governance.gates`; the schema is `config/probe-config.schema.json`.

## Why this exists

A team adopting PROBE needs to run the process end to end before it agrees to be
bound by it. During that trial, a gate that blocks delivery is not governance —
it is an adoption barrier, and the usual outcome is that the team stops using
the process rather than stops shipping.

The wrong fix is to delete the gate checks, because then nothing records what
shipped un-gated and the evaluation produces no evidence about whether the gates
were worth having. Hibernation is the right fix: **the gate still runs, still
assembles evidence, and still tells the truth about readiness — it simply does
not block, and it says so everywhere.**

## Declaring it

```yaml
governance:
  gates:
    mode: hibernated # active | hibernated
    scope: [design, merge, ops]
    authorizedBy:
      name: <full name>
      email: <address>
      role: <PROBE Owner | QA Lead | Automation Engineer>
    reason: <why, in one sentence>
    since: <YYYY-MM-DD>
    until: <YYYY-MM-DD | null> # null = ends only by an explicit config change
    reviewOn: <YYYY-MM-DD> # advisory only; never resumes gates by itself
```

`mode: hibernated` requires `scope`, `authorizedBy`, `reason` and `since`. A
hibernation with no named human and no reason is not a governance decision, and
the configuration is rejected rather than honoured.

Absent the block entirely, gates are **active**. That is the default, and no
skill infers hibernation from anything else.

## What hibernation does

| Gate behaviour              | Active                             | Hibernated              |
| --------------------------- | ---------------------------------- | ----------------------- |
| Evidence assembled          | yes                                | **yes — unchanged**     |
| Readiness reported honestly | yes                                | **yes — unchanged**     |
| Missing/failed items listed | yes                                | **yes — unchanged**     |
| Human signature required    | yes                                | no                      |
| Blocks the next stage       | yes                                | **no**                  |
| Reported status             | `READY` / `NOT READY` / `APPROVED` | `HIBERNATED — <reason>` |

The gate report is still written, still committed, and still says `NOT READY`
with its failing checklist items when that is the truth. Hibernation changes
**one** thing: whether that verdict stops work.

## What hibernation does not do

Five things stay exactly as they are, and a skill that suspends any of them has
misread this document:

1. **The severity ladder is untouched.** A `blocker` still halts an orchestrator
   immediately; a `high` still halts after the current step. Wrong business data
   is still `blocker`, always. Gates and severities are different mechanisms, and
   suspending the second would make the evaluation worthless — the team would
   never see PROBE catch anything.
2. **Audits still run and still fail.** Case Audit and Script Audit produce their
   verdicts unchanged. Hibernation does not waive an audit; `/bypass-gate`
   supports separate `case-audit`, `script-audit`, and `audits` scopes, while
   `/owner-bypass` remains available for an exact owner-authorized item. Script
   Audit waivers remain bound to the current TC and commit/file-hash manifest.
3. **No gate is ever reported as approved.** A hibernated gate is
   `HIBERNATED`, never `APPROVED`, `PASSED`, or `SIGNED`. Anything that renders
   it as approval is falsified evidence — `blocker` under the ladder.
4. **The traceability chain is unchanged.** AC → case → AIO id → scenario → run
   evidence still holds, and a break in it is still a finding.
5. **External writes still need their own authorization.** A live AIO sync, a
   Jira bug filing, and a push each need explicit human approval regardless of
   gate state.

## What every skill must record

Hibernation is only safe if it is visible, so silence is the failure mode this
section exists to prevent.

**Gate skills** (`/gate-design`, `/gate-merge`, `/gate-ops`) write the report as
normal, then add a header block naming the mode, the authorizer, the reason, the
`since` date, and the `until` or `reviewOn` date. The verdict line reads
`HIBERNATED — evidence assembled, not signed`, followed by the honest readiness
verdict it would otherwise have carried.

**Gate-checking skills** (`/forge-scripts`, `/testops-promote`) accept
hibernation in place of the approval they normally demand, and say so in their
own artifact: which gate was hibernated, under whose authorization, and what the
gate's real readiness verdict was at the time.

**The ledger** records one row per stage that proceeded under hibernation. That
row is the point of the whole mechanism: when gates resume, the accumulated rows
are the debt list — every feature that shipped without a signature, with the
readiness verdict it actually had.

## Resuming

Set `mode: active`, or remove the block. Nothing else changes; no artifact is
rewritten and no signature is backfilled.

What resumption produces is a **gate-debt list**: every ledger row recorded under
hibernation, with its stage, its feature, and its real readiness verdict. Each
one is then either signed, explicitly bypassed through `/bypass-gate`, or
remediated. A feature whose gate said `NOT READY` under hibernation does not
become `READY` because time passed.

When `until` is a date and that date has passed, gates are **active** regardless
of `mode`. An expired hibernation is reported as expired, not silently honoured.
When `until` is `null`, hibernation ends only by an explicit configuration
change; `reviewOn` is surfaced in every gate report so the decision stays
visible, but it never resumes gates on its own.
