---
description: Use when a scripting branch is ready for independent adversarial review across its applicable UI, API, data, queue, policy, audit, integration, and chart contracts. A named QA Lead or Automation Engineer may explicitly waive the exact audit scope through /bypass-gate; the audit skill itself never creates or hides a waiver. PROBE Script Audit stage.
argument-hint: <feature-slug> [branch] [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

Run the PROBE `audit-scripts` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/audit-scripts/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
