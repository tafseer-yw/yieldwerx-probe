---
description: Use when a reviewed development change is ready to leave the working tree — pre-commit hygiene, local commits that explain why, a pull-request body carrying the evidence, or both. Never pushes or opens a pull request without explicit human authorization, and never merges. PROBE development track.
argument-hint: <feature-slug> [commit|describe|both] [--push] [--open-pr] [--base <ref>]
---

Run the PROBE `ship-change` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/ship-change/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
