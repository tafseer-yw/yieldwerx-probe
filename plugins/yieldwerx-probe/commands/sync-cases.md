---
description: Use when AIO-eligible non-API Gherkin scenarios authorized by a Design Gate approval or explicit allrounder bypass must be pushed to Jira AIO Tests. Excludes @api, @testtype:api, @testtype:contract, and @testtype:performance scenarios unconditionally. PROBE Case Sync stage.
argument-hint: <feature-slug> [--live] [--category CAT-NN]
---

Run the PROBE `sync-cases` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/sync-cases/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
