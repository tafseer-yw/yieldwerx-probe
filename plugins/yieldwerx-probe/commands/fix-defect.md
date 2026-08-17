---
description: Use when any defect must be corrected in application code — a reported symptom, a failing scenario, or a PROBE bug candidate. Reproduce it with a failing test first, make the smallest change that turns it green, verify nothing else moved, and report the evidence. Needs no QA artifact and no gate. PROBE development track.
argument-hint: <feature-slug> "<defect-slug-or-symptom>" [--candidate <path>] [--tc TC-id] [--no-test "<reason>"]
---

Run the PROBE `fix-defect` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/fix-defect/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
