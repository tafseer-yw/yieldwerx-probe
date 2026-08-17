---
description: Use once at the start of an application under test to stand up a runnable skeleton whose QA contracts exist from the first commit — a documented API surface, role-based authorization, a queryable datastore, a selector policy the frontend follows, and reset-and-seed control. Everything PROBE's recon and verification stages need, present before any feature is built. PROBE development track.
argument-hint: <app-slug> [--stack <profile-name>] [--surfaces api,ui,db,auth,queue] [--dry-run]
---

Run the PROBE `scaffold-app` skill.

Read `${CLAUDE_PLUGIN_ROOT}/skills/scaffold-app/SKILL.md` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
