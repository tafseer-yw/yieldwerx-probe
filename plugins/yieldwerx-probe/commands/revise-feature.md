---
description: Use when behaviour that already exists must change — inventory the current behaviour and everything that depends on it before touching anything, keep compatibility unless a break is explicitly authorized, migrate stored data safely, and name every QA artifact the change invalidates. PROBE development track.
argument-hint: <feature-slug> -- <what must change> [--breaking-ok "<authorization>"] [--ac AC-NN]
---

Run the PROBE `revise-feature` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/revise-feature/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
