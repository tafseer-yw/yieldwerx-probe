---
description: Use when Design-Gate-authorized UI cases should be executed through Playwright MCP in one controlled browser batch - reuses the browser connection, isolates every independent case, records every Gherkin step, and captures a standardized failure-evidence packet for triage and bug reporting.
argument-hint: <feature-slug> [env] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]
---

Run the PROBE `execute-cases` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/execute-cases/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
