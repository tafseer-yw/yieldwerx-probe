# Ledger template

Read this reference when Spec Probe creates a feature ledger or adds a Spec
reconciliation row.

```markdown
# Ledger — <Feature Name> (`<feature-slug>`)

Spec source: <path/link> · AIO set: <key or TODO> · Created: <date>

| Stage                | Skill                 | Status             | Artifact | Updated |
| -------------------- | --------------------- | ------------------ | -------- | ------- |
| Spec Probe           | /probe-spec           | pending            | —        | —       |
| Implementation Probe | /probe-implementation | pending — optional | —        | —       |
| Case Forge           | /forge-cases          | pending            | —        | —       |
| DESIGN GATE          | /gate-design          | pending            | —        | —       |
| Case Sync            | /sync-cases           | pending            | —        | —       |
| UI Recon             | /ui-recon             | pending            | —        | —       |
| Exploratory Run      | /log-exploratory      | pending            | —        | —       |
| Script Forge         | /forge-scripts        | pending            | —        | —       |
| Stability Run        | /green-run            | pending            | —        | —       |
| MERGE GATE           | /gate-merge           | pending            | —        | —       |
| TestOps Promotion    | /testops-promote      | pending            | —        | —       |
| OPS GATE             | /gate-ops             | pending            | —        | —       |

Statuses: pending · in-progress · done · blocked · n/a

The three GATE rows are the only rows that need a human decision. Every other
row is progress tracking. Advisory work — `/audit-scripts`, validators, lint,
the coverage report — has no row here; its result appears in the gate report's
evidence digest.

## Spec reconciliations

| Date | Mode | Result | ACs affected | Downstream action | Report |
| ---- | ---- | ------ | ------------ | ----------------- | ------ |

## Gate approvals (human decisions)

Authority: `${CLAUDE_PLUGIN_ROOT}/references/governance/human-gates.md`.

A gate is a record of a human decision. One row per decision, appended — never
edited, never recomputed. A superseding approval is a new row.

| Gate | Scope | Approved by | Role | Timestamp | Confirmed | Evidence |
| ---- | ----- | ----------- | ---- | --------- | --------- | -------- |
|      |       |             |      |           |           |          |

- **Timestamp** is `YYYY-MM-DD HH:MM` local time, recorded when the human states
  the decision.
- **Confirmed** carries what the human said they reviewed, in their terms — it is
  the column that gives the row its meaning, including when the digest listed
  gaps. Approving with the gaps visible is a real decision and the record must
  show which one was made.
- **Evidence** links the gate report the decision was made against.
- Claude may write the row on the human's behalf and adds
  `Recorded by: Claude — transcribed from the human's direct approval`.
- Claude never writes an approval the human did not state. A gate with no human
  statement has no row, and the downstream stage stays locked.
- `continue`, `go ahead`, and `looks fine` are not approvals. Ask which is meant.

### Per-category Design Gate approvals

Use these rows when categories are designed and approved independently so team
members work different categories in parallel. A category approval authorises
`/sync-cases --live --category CAT-NN` and Script Forge for **that category
only** — it never approves another category or the feature as a whole.

| Category | ACs | Case Forge | Approved by | Role | Timestamp | Confirmed | `@auto:now` |
| -------- | --- | ---------- | ----------- | ---- | --------- | --------- | ----------- |
|          |     |            |             |      |           |           |             |

The whole-feature Design Gate row stays `in-progress` until every in-scope
category is approved.

## Case amendments

Every amendment records what it invalidates, so a later gate can see whether its
evidence predates a change. An `expected-value`, `structural`, or `scope`
amendment invalidates the approval for the cases it touched; the affected gate
needs a fresh decision and a new approval row.

| Date | TCs | Type | What changed | What it invalidates | Report |
| ---- | --- | ---- | ------------ | ------------------- | ------ |
```
