---
name: ask-yieldwerx
user-invocable: true
description: Answer YieldWerx product, module, workflow, data, calculation, report, UI, and QA questions through the approved YieldWerx knowledgebase. Use when someone needs simple product context, domain meaning, QA guidance, or supporting knowledge for a PRD, test case, or defect.
argument-hint: <question>
---

# Ask YieldWerx

> **Portability contract:** This is a public `yw` namespace adapter. The
> authoritative knowledge workflow stays in the separately versioned
> `yieldwerx-knowledgebase` plugin.

## Why

Give everyone one short command for approved YieldWerx product knowledge.

## What

Forward the question to the authoritative knowledgebase skill without copying
or changing its product facts.

## When

Use this for YieldWerx terms, modules, workflows, reports, calculations, UI,
test design, defects, and onboarding questions.

## Where

The answer comes from
`yieldwerx-knowledgebase:ask-yieldwerx@yieldwerx-company`. That skill selects
the smallest relevant knowledge files and reports its sources.

## How

1. Invoke the Skill tool for `yieldwerx-knowledgebase:ask-yieldwerx`.
2. Pass the user's exact arguments: `$ARGUMENTS`.
3. Follow the loaded knowledge skill completely.
4. Return its answer in simple QA-friendly language.
5. If the dependency cannot load, stop and state that
   `yieldwerx-knowledgebase@yieldwerx-company` is missing or disabled. Do not
   guess product behavior.
