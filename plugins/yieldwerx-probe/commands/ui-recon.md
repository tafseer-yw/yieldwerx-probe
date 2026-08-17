---
description: Use when a UI environment exists before scripting — drives the live app through the configured browser connector to walk cases authorized by Design Gate approval or explicit allrounder bypass, harvest stable selectors, capture states, and flag profile-defined observability gaps. Can coordinate API Recon and assisted case execution in the same authorized browser walk. PROBE UI Recon stage (optional but strongly recommended).
argument-hint: <feature-slug> [env] [--with-api-recon] [--spec <path-or-url>] [--with-case-execution] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]
---

Run the PROBE `ui-recon` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/ui-recon/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
