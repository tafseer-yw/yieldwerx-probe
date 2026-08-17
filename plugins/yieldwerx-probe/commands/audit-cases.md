---
description: Use when designed test cases need adversarial review before the Design Gate — coverage vs spec, traceability completeness, step atomicity, negative/boundary depth, data feasibility. PROBE Case Audit stage. A named QA Lead or Automation Engineer may explicitly waive this stage through /bypass-gate or gate-design; the audit skill itself never creates or hides a waiver.
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

Run the PROBE `audit-cases` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/audit-cases/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
