---
description: Use when a named QA Lead or Automation Engineer allrounder explicitly says to bypass Case Audit, Script Audit, the PROBE Design Gate, Merge Gate, Ops Gate, all audits, or all applicable gates for a feature/category. Records a human waiver without pretending evidence passed, preserves missing or failed findings and residual risk, updates the exact audit/gate artifact and ledger, and lets downstream PROBE stages accept only the recorded scope.
argument-hint: <feature-slug> <case-audit|script-audit|audits|design|merge|ops|all> [--category CAT-NN] [--reason "<reason>"]
---

Run the PROBE `bypass-gate` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/bypass-gate/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
