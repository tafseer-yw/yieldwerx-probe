---
description: Use when a requirement must become a working, verified capability in the application under test — clarify without assuming, design against the repository's real layers, implement in bounded tasks, and loop on exact failures until green. Ships its own observability contracts. Runs with or without PROBE's QA track; needs no gate. PROBE development track.
argument-hint: <feature-slug> [--ac AC-NN] [--category CAT-NN] [--requirement <path>] [--no-requirement "<reason>"]
---

Run the PROBE `build-feature` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/build-feature/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
