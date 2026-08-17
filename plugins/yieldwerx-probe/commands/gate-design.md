---
description: Use when Spec Probe and Case Forge are done and the Design Gate needs its evidence report assembled, approved, or explicitly bypassed; when a named allrounder bypasses Case Audit; or when a human replies `approved` to a ready report. A Domain Test Analyst signs manually by default. A named QA Lead or Automation Engineer may approve solo, waive Case Audit, or bypass the Design Gate even when it is NOT READY. Claude records the human decision, exact scope, date, residual risk, automation set, ledger status, and waiver without pretending bypassed evidence passed.
argument-hint: <feature-slug> [--category CAT-NN] [approved] [bypass Case Audit] [bypass Design Gate] [--owner-receipt <path>]
---

Run the PROBE `gate-design` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/gate-design/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
