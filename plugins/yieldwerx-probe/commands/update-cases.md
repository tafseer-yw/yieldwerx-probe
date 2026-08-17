---
description: Use when existing designed test cases need targeted amendment rather than redesign — an answered open question, a Case Audit finding, a spec change, a UI change-impact result, or a wrong expected value. Edits the affected scenarios in place, preserves TC ids and AIO keys, and records what the change invalidates downstream. Never regenerates a feature file. PROBE Case Forge amendment path.
argument-hint: <feature-slug> -- <what needs to change>
---

Run the PROBE `update-cases` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/update-cases/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
