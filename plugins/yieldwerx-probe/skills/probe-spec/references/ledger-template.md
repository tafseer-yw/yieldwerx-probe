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
| Case Audit           | /audit-cases          | pending            | —        | —       |
| DESIGN GATE          | /gate-design          | pending            | —        | —       |
| Case Sync            | /sync-cases           | pending            | —        | —       |
| UI Recon             | /ui-recon             | pending            | —        | —       |
| Exploratory Run      | /log-exploratory      | pending            | —        | —       |
| Script Forge         | /forge-scripts        | pending            | —        | —       |
| Script Audit         | /audit-scripts        | pending            | —        | —       |
| Stability Run        | /green-run            | pending            | —        | —       |
| MERGE GATE           | /gate-merge           | pending            | —        | —       |
| TestOps Promotion    | /testops-promote      | pending            | —        | —       |
| OPS GATE             | /gate-ops             | pending            | —        | —       |

Statuses: pending · in-progress · done · blocked · waived · n/a

## Spec reconciliations

| Date | Mode | Result | ACs affected | Downstream action | Report |
| ---- | ---- | ------ | ------------ | ----------------- | ------ |

## Gate approvals (human decisions)

### Design Gate — default signer: Domain Test Analyst

- Approved by: ____ · Role: ____ · Date: ____ · Decision: approved / rejected
- Recorded by: ____ · Approval evidence: ____
- `@auto:now` set confirmed: ____

For a Domain Test Analyst or other non-allrounder, keep manual signing. For a
named QA Lead or Automation Engineer allrounder, a direct `approved` statement
to Claude authorizes Claude to fill this block, the Design Gate report, the
date, confirmed `@auto:now` set, stage status, and waiver row. Record:

- `Recorded by: Claude — transcribed from direct allrounder approval`
- `Approval evidence: direct approval in the current Claude session`

Claude records the human decision; Claude does not make the decision. Never use
this shortcut for an unknown role or a non-allrounder. A bare `approved`
statement does not bypass Case Audit or another `NOT READY` item.

### Allrounder Case Audit bypass

A named QA Lead or Automation Engineer may explicitly waive a missing, blocked,
or failed Case Audit for the whole feature or one category. Record the Case
Audit stage or category cell as
`waived — allrounder Case Audit bypass`. Keep any audit artifact and findings.
Add a separate waiver row with the exact scope, reason, known findings or
missing review, residual risk, and
`direct allrounder bypass in the current Claude session`.

The audit bypass covers only Case Audit. Any other blocking PROBE item remains
open unless fixed or separately authorized by the PROBE Owner.

### PROBE Owner override

PROBE Owner **Tafseer Haider** (`tafseer.haider@yieldwerx.com`) has allrounder
authority to waive any named PROBE item. Require a valid short-lived receipt
from `/owner-bypass`; never put the PIN or its value in this ledger. Record the
receipt's `PBA-*` authorization ID, exact scope, reason, evidence gap, and
residual risk, then consume the receipt.

### Allrounder gate bypass

A named QA Lead or Automation Engineer may explicitly bypass any PROBE gate:
Design, Merge, or Ops. A bare `approved`, `continue`, or `go ahead` is not a
bypass. Use `/bypass-gate` and record:

- `Decision: bypassed`;
- gate status `waived — allrounder gate bypass`;
- the exact feature/category scope;
- human name and allrounder role;
- date and reason;
- every known failed or missing item and residual risk;
- `Claude — transcribed from direct allrounder gate bypass`;
- `direct allrounder bypass in the current Claude session`.

Keep the gate report's real evidence verdict (`READY`, `NOT READY`, or
`not assembled`). Never call a bypass `approved`, `signed`, `done`, or `PASS`.
When the allrounder says `bypass all gates`, add a separate decision and waiver
row for Design, Merge, and Ops; do not use one wildcard row.

### Per-category Design Gate approvals

Use these rows when categories are approved and synced independently. A
category approval never approves another category or the whole feature.

| Category | ACs | Case Forge | Case Audit | Signed by | Role | Date | Decision | Recorded by | `@auto:now` |
| -------- | --- | ---------- | ---------- | --------- | ---- | ---- | -------- | ----------- | ----------- |

For an allrounder shortcut, `Signed by` names the human, `Role` is `QA Lead` or
`Automation Engineer`, and `Recorded by` is
`Claude — transcribed from direct allrounder approval`. Add a category-specific
waiver row below. When the category audit is bypassed, set its `Case Audit`
cell to `waived — allrounder Case Audit bypass`.

For a category Design Gate bypass, set `Decision` to `bypassed`, keep `Signed
by` as the human allrounder's name, and set `Recorded by` to
`Claude — transcribed from direct allrounder gate bypass`. The gate stage is
`waived — allrounder gate bypass`, not `done`.

### Merge Gate — signer: any allrounder (QA Lead / Automation Engineer)

- Signed by: ____ · Date: ____ · Decision: ____

### Ops Gate — signer: any allrounder

- Signed by: ____ · Date: ____ · Decision: ____

## Waivers (no silent waivers — every bypass is recorded)

| Date | Gate/Item | Scope | Waived by | Role/Authority | Reason | Known gap / residual risk | Authorization |
| ---- | --------- | ----- | --------- | -------------- | ------ | ------------------------- | ------------- |
```
