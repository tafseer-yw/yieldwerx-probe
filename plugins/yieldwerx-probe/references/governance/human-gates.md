# Human gates

The contract for every PROBE gate. Authority for the behaviour `/gate-design`,
`/gate-merge`, and `/gate-ops` must follow, and for every skill that checks a
gate before it proceeds.

## Why this exists

PROBE has exactly three gates, and each one is **a record of a human decision**.
Nothing else is a gate.

Earlier versions computed a readiness verdict, blocked on it, and then needed a
waiver system, an audit-bypass system, a PIN-authorised owner override, and a
hibernation mode to let real work past a verdict a human had already judged
acceptable. Five mechanisms existed to argue with a fourth one that nobody had
asked for. All of them are gone.

What remains is the part that was always doing the work: a named human reads the
evidence, says they approve it, and that decision is recorded with a timestamp.

## What a gate does

Four steps, identical at all three gates.

1. **Assemble** an evidence digest — facts only. Counts, coverage numbers, lint
   results, run results, and a plain list of anything missing or failing.
2. **Present** it, and stop. No verdict, no readiness stamp, no blocking
   checklist, no halt rule.
3. **Record** the human's decision when they state it, as one approval row.
4. **Unlock** the next stage.

## The evidence digest

The digest is what the human reads, so it is written for a five-minute read and
it never editorialises.

- **Facts, not verdicts.** Report `design coverage 94% — AC-07 has no scenario`,
  never `NOT READY`. The number and the gap are the useful parts; the stamp was
  the part that needed overriding.
- **Gaps are listed, never hidden and never softened.** Anything missing,
  failing, unrun, or unavailable appears in a `Gaps and open items` section with
  what it is and why it matters. A gate whose digest omits a known gap is
  falsified evidence, and that is still the most serious failure in this process.
- **No stage is a precondition for assembling a digest.** If Case Forge is
  partial or a stability run never happened, the digest says so. Assembling the
  facts is always allowed.
- The digest is committed alongside the ledger, so an approval always points at
  what was true when it was given.

## The approval row

One row per gate decision, written into the feature ledger's **Gate approvals**
table and mirrored in the gate report:

| Field           | Content                                                          |
| --------------- | ---------------------------------------------------------------- |
| **Gate**        | `Design Gate`, `Merge Gate`, or `Ops Gate`                        |
| **Scope**       | `feature` or an exact `CAT-NN`                                    |
| **Approved by** | the human's name                                                  |
| **Role**        | their role                                                        |
| **Timestamp**   | `YYYY-MM-DD HH:MM` local time, recorded when the human states it  |
| **Confirmed**   | what they said they reviewed, in their terms                      |
| **Evidence**    | link to the gate report the decision was made against            |

`Confirmed` is the column that carries the meaning. A human who says "I have
reviewed all the cases and I approve them" gets exactly that recorded — including
when the digest listed gaps, because approving with the gaps visible is a real
decision and the record has to show which one was made.

## Recording it

Any role may approve any gate. The approving human is named in the row, and their
statement is the authorisation.

An explicit statement is required. `approved`, `I approve these cases`, and
`reviewed and approved` are approvals. `continue`, `go ahead`, `looks fine`, and
silence are not — ask which they mean rather than inferring.

Claude writes the row on the human's behalf and records
`Recorded by: Claude — transcribed from the human's direct approval`. That is a
transcription of a decision, not a decision.

## The one hard rule

**Claude never writes an approval the human did not state.** Not from a clean
digest, not from an earlier approval of a different scope, not from an approval
of a previous version of the same evidence, and not because every check passed.
A gate with no human statement has no approval row, and the downstream stage
stays locked.

## What is not a gate

These produce facts for the digest. None of them blocks, holds a ledger gate row,
or needs a waiver when it fails or does not run:

- validators and linters (`validate-spec-analysis`, the configured `lintCases`);
- the requirements-coverage report;
- `/audit-scripts` — an advisory review, run when useful;
- the stability run's consecutive-green result;
- flake rate, report history, and external-sync health.

A failing one of these is a line in `Gaps and open items`. The human decides what
it is worth.

## Unlocking

A downstream skill checks one thing: **is there an approval row for the gate and
scope it needs, naming a human, with a timestamp?**

| Skill                | Requires                                                     |
| -------------------- | ------------------------------------------------------------ |
| `/sync-cases --live` | Design Gate approval for the feature, or for its `--category` |
| `/forge-scripts`     | Design Gate approval for the scope being scripted             |
| `/testops-promote`   | Merge Gate approval, plus an actual merge through the         |
|                      | repository's own authorisation and branch protection          |

That is the whole check. No hash comparison, no audit verdict, no staleness rule,
no waiver lookup.

Two boundaries this authority does not touch:

- **Repository controls are not PROBE's.** A Merge Gate approval records a QA
  decision; it never merges a branch or satisfies branch protection.
- **External writes keep their own authorisation.** A live case-management sync,
  a bug filing, and a push each need their own explicit human confirmation,
  whatever the ledger says.

## Amendments

An approval is bound to the evidence it was given against. When cases, scripts,
or run evidence change afterwards, `/update-cases` records what the change
invalidates, and the affected gate needs a fresh decision — the timestamp on the
old row is what makes the sequence legible. Nothing is recomputed and no earlier
row is edited; a superseding approval is a new row.
