---
description: Use when application code is ready for independent adversarial review before merge — correctness, data integrity, security, error handling, requirement fidelity, and the observability obligations the QA track depends on. The application-code counterpart of audit-scripts, which reviews test code. PROBE development track.
argument-hint: <feature-slug> [branch|--staged|--files <path,...>] [--focus correctness|security|data|observability|all] [--depth quick|thorough]
---

Run the PROBE `review-code` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/review-code/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
