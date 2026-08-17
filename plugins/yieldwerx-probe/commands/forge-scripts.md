---
description: Use when the Design Gate has a recorded human approval or explicit allrounder bypass and the authorized cases must become automated scenarios — feature files, steps, page/component objects, API/DB/oracle assertions, tagged and traced to AIO ids. PROBE Script Forge stage.
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

Run the PROBE `forge-scripts` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/forge-scripts/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
