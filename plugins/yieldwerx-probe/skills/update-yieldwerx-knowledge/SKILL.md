---
name: update-yieldwerx-knowledge
user-invocable: true
description: Update approved YieldWerx product knowledge through the maintained knowledgebase workflow. Use when someone asks to add, correct, review, regenerate, or publish knowledge from an approved PRD, handbook edition, product decision, or corrected domain source.
argument-hint: <approved-change-request>
---

# Update YieldWerx knowledge

> **Portability contract:** This is a public `yw` namespace adapter. The
> authoritative update workflow stays in the separately versioned
> `yieldwerx-knowledgebase` plugin.

## Why

Give maintainers one short command while preserving knowledge ownership,
review, history, and source traceability.

## What

Forward the requested update to the authoritative knowledgebase maintenance
skill without keeping a second copy of its procedure.

## When

Use this after an approved PRD, handbook edition, product decision, or domain
correction must change the shared knowledgebase.

## Where

The update is controlled by
`yieldwerx-knowledgebase:update-yieldwerx-knowledge@yieldwerx-company` and
writes only to the configured knowledgebase repository.

## How

1. Invoke the Skill tool for
   `yieldwerx-knowledgebase:update-yieldwerx-knowledge`.
2. Pass the user's exact arguments: `$ARGUMENTS`.
3. Follow the loaded maintenance skill completely.
4. Preserve its source approval, validation, and human review requirements.
5. If the dependency cannot load, stop and state that
   `yieldwerx-knowledgebase@yieldwerx-company` is missing or disabled. Do not
   update a copied or consumer-local handbook instead.
