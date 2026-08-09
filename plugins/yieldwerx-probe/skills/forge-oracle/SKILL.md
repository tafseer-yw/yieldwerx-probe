---
name: forge-oracle
user-invocable: true
description: Design an independent, domain-reviewed test oracle when a business feature contains calculated, aggregated, transformed, classified, or rule-derived expected results. Use after requirements and cases are approved, before implementing assertions that require expected business values.
track: scripting
safety: writes-local
produces: an approved truth implementation appropriate to the feature, its self-tests, .probe/artifacts/<feature>/60-scripts/oracle-design.md
consumes: 10-spec/spec-analysis.md, approved cases, evidence/data strategy, business rules, Design Gate evidence
argument-hint: <feature-slug>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Forge Oracle

## Why

Ensure expected business results come from an independent source instead of
being copied from the implementation under test.

## What

Design and verify a domain-reviewed oracle for calculations, transformations,
classifications, aggregations, or rule-derived outcomes.

## When

Run after requirements and cases are approved and before Script Forge adds
assertions that depend on derived expected values.

## Where

Implement the oracle in the consumer's approved test-support location and
record its provenance and contract in the feature's `60-scripts` artifacts.

## How

Trace rules to approved sources, define deterministic inputs and outputs,
encode boundary and error behavior, add self-tests with hand-worked examples,
and obtain the required domain review.

Build an independent truth implementation for expected calculations, decisions,
states, contracts, events, or reconciliations. The bundled wafer oracle is one
worked example, not a universal YieldWerx truth strategy.

## Preconditions

- Design Gate requirements and test-case approval exists.
- The input-data format and authoritative business rules are available.
- A domain reviewer is identified.

If semantics, rounding, classification, connectivity, time-zone, null, or boundary rules are unclear, record `TODO(domain)` and stop that assertion. Never invent expected values.

## When an oracle is required

Use an oracle for calculated, aggregated, transformed, classified, or rule-derived output. Static text and simple visibility checks normally need direct assertions. An independently maintained approved dataset may also be the oracle.

## Independence rules

- Do not import production calculation code.
- Do not obtain expected values from the same UI, API, or database path being tested.
- Do not generate both a fixture and its expected values with the same oracle.
- Keep the oracle deterministic and free of browser, network, and database access.

## Workflow

1. Read the approved feature, cases, input schema, fixtures, and source requirements.
2. List every derived output, invariant, boundary, and policy decision.
3. Write `.probe/artifacts/<feature>/60-scripts/oracle-design.md` with rule provenance, assumptions, input/output contract, edge cases, and review owner.
4. Implement the approved form: pure typed oracle, state-transition model,
   authorization decision table, schema/contract validator, reconciliation
   query, event-sequence model, or versioned reference dataset. Pass policies
   and their version/effective date explicitly.
5. Add focused self-tests with hand-derived examples, boundaries, invalid
   inputs, and invariants. Include at least one expected result not produced by
   the implementation itself; add property/mutation tests when useful.
6. Keep the feature step manual and visible (for example, verify the displayed
   yield or exported value). Compare the application result with the oracle
   behind that step in the automation implementation. For critical live
   scenarios, add independent database evidence when the approved design
   requires it.
7. Run lint, typecheck, self-tests, BDD generation, and the affected scenarios.
8. Obtain domain review and record its status. Until reviewed, the oracle is provisional evidence.

## Reuse rule

Reuse a truth implementation only when the input contract, policy/version, and
approved rules are identical. Otherwise create or version it. Never reuse
`waferOracle` merely because the application belongs to YieldWerx.
