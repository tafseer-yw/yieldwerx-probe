---
description: Use when starting QA work on a new feature, analyzing a provided PRD/story/specification, migrating an older spec-analysis artifact to the current AC format, or reconciling an existing analysis with a revised approved requirement document — treats the provided requirement package as the sole requirement source of truth; uses the YieldWerx knowledgebase only for terminology and business context; writes every acceptance criterion with a "Verify that ..." summary and Given/When/Then steps; preserves stable IDs and reports downstream impact. PROBE Spec Probe stage.
argument-hint: <feature-slug> [<spec-path-or-text>] [--migrate-format | --reconcile] [--compare-implementation <env-or-url>] [--role <role>] [--build <id>]
---

Run the PROBE `probe-spec` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/probe-spec/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
