# Knowledge-reference contract

## Why

PROBE owns the QA process. The provided PRD, story, ticket, addendum, or other
approved requirement document owns feature requirements. The YieldWerx
knowledgebase provides terminology and business context only.

## Configured Claude skill

For YieldWerx consumers, use this contract:

```yaml
integrations:
  knowledge:
    provider: yieldwerx-knowledgebase
    required: true
    source: claude-plugin
    marketplace: yieldwerx-company
    plugin: yieldwerx-knowledgebase
    skill: ask-yieldwerx
    revision: 1.1.0
```

When `source` is `claude-plugin`:

1. Load the public namespaced skill `yw:ask-yieldwerx`. Its adapter forwards to
   the authoritative `yieldwerx-knowledgebase:ask-yieldwerx` dependency.
2. Start with its topic index.
3. Read only the chapter files needed for the feature.
4. Use the returned material to understand YieldWerx words, modules, and the
   overall business picture. Do not use it to create or complete an acceptance
   criterion, expected value, condition, boundary, role, or workflow.
5. Record the configured knowledge revision under `Reference context
consulted`, never as the requirement source.

Use this reference-context form:

```text
[Reference context only — not a requirement: handbook-third-html, sec-ch17; yieldwerx-knowledgebase 1.1.0]
```

Use `yw:update-yieldwerx-knowledge` for approved knowledge changes. It forwards
to the knowledgebase maintenance skill and preserves that repository's review
rules.

## Failure behavior

If `required: true` and the plugin or skill cannot be loaded:

- mark the current stage `blocked`;
- name the missing plugin, skill, or access;
- record that the configured context review could not run;
- do not fall back to a copied domain map or observed implementation;
- do not imply that the PRD requirement itself came from the missing
  knowledgebase.

If `required: false`, continue on the provided requirement. Keep any missing
behavior, value, or interpretation as a question.

## Requirement authority

The only feature-requirement authority is the approved requirement package
provided to Spec Probe. It may contain a PRD, story, ticket, approved addendum,
or durable decision supplied as part of that package.

- Knowledgebase, handbook, training, and domain-map material are reference
  context only.
- Observed implementation is implementation evidence only.
- If reference context disagrees with the provided requirement, the provided
  requirement wins and the conflict is recorded.
- If the requirement is silent or unclear, raise a question. Never fill the
  gap from reference context or current implementation.

In `spec-analysis.md`, `AC`, `AMB`, and `OOS` Source cells cite only the
provided requirement's section/page.
