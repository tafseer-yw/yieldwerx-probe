---
description: Use when spec analysis is done and QA-owned UI, API, contract, security, or API-performance test cases must be designed as Gherkin feature files, in business-readable procedural style with automation pacing, candidacy, and a developer-owned unit/internal-integration hand-off. The AIO push is separate; amend existing cases with /update-cases. PROBE Case Forge stage.
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN]
---

Run the PROBE `forge-cases` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/forge-cases/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
