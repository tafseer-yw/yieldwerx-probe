---
description: Use when a scenario fails intermittently locally, in assisted execution, or in CI - preserves the original evidence, classifies root cause via flake-hunter, applies quarantine policy, and produces the exit-evidence trail. Cross-track.
argument-hint: <feature-slug-or-scenario> [evidence-path]
---

Run the PROBE `flake-triage` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/flake-triage/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
