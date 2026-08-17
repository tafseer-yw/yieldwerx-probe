---
description: Use when Script Forge, Script Audit (PASS or exact allrounder waiver), and Stability Run evidence must be assembled for Merge Gate sign-off, or when a named QA Lead or Automation Engineer explicitly bypasses Script Audit or the Merge Gate. Includes the hard testId-coverage check, preserves NOT READY findings, and records bypasses as human waivers rather than passes.
argument-hint: <feature-slug> [bypass Script Audit] [bypass Merge Gate]
---

Run the PROBE `gate-merge` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/gate-merge/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
