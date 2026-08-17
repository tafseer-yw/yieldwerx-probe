---
description: Use when TestOps Promotion evidence must be assembled for the Ops Gate, or when a named QA Lead or Automation Engineer explicitly bypasses the Ops Gate. Checks CI green ×N, report history, flake rate, AIO synchronization, and durable evidence; preserves NOT READY findings and records bypassed automation as Done with visible residual risk.
argument-hint: <feature-slug> [N-runs] [bypass Ops Gate]
---

Run the PROBE `gate-ops` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/gate-ops/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
