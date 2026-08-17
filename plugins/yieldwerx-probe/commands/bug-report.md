---
description: Use when any PROBE stage, assisted case execution, or CI uncovers an application defect - produces a reproducible, severity-classified bug report with an evidence-backed RCA status and prepares a reviewed Jira candidate. Cross-track.
argument-hint: <feature-slug> <one-line-symptom>
---

Run the PROBE `bug-report` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/bug-report/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
