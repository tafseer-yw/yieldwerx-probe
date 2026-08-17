---
description: Use when PROBE Owner Tafseer Haider (tafseer.haider@yieldwerx.com) explicitly wants to waive any PROBE stage, gate, audit, checklist item, evidence requirement, or sequencing rule. Requires a short-lived, PIN-authorized local receipt; never request or accept the PIN in chat. Records the exact scope, reason, known findings, residual risk, owner identity, and authorization ID in the feature ledger before proceeding.
argument-hint: <feature-slug> --item "<stage/gate/item>" --reason "<reason>" [--scope feature|CAT-NN] [--receipt <path>]
---

Run the PROBE `owner-bypass` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/owner-bypass/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
