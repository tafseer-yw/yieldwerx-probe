---
name: forge-tech-design
user-invocable: true
description: Use when a spec analysis must become a technical design before building — the layer-by-layer solution for the declared stack, data model and migration outline, API contract, tenancy/authorization/auditing/logging as first-class sections, the testability obligations the build must ship, a threat sketch, risks, and decision records. Consumes 10-spec/spec-analysis.md (never the raw PRD) and refuses to design while blocking questions are open. PROBE development track.
track: dev
safety: writes-local
produces: .probe/artifacts/<feature>/60-design/tech-design.md, .probe/artifacts/<feature>/60-design/decisions/NNNN-<slug>.md
consumes: .probe/artifacts/<feature>/10-spec/spec-analysis.md, the active stack profile, existing code where a repository exists
argument-hint: <feature-slug> [--stack <profile-name>] [--ac AC-NN]
graph:
  consumes: [artifact:10-spec/spec-analysis.md, profile:active, code:*]
  produces: [artifact:60-design/tech-design.md, artifact:60-design/decisions]
  delegates: [agent:tech-designer]
  next: [skill:build-feature, skill:forge-migration, skill:forge-unit-tests]
  scope: [repo:*]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Tech Design Forge (dev track)

## Why

A build that starts without a design resolves every architectural question at
the moment it is cheapest to get wrong and hardest to review. The design is
where the spec's intent meets the stack's reality — and where insecure design
(the OWASP category that cannot be scanned for later) is either prevented or
committed.

## What

`60-design/tech-design.md`: the layer map in the active profile's own layer
names, the data model with a migration outline, the API contract, cross-cutting
concerns, the testability obligations the build must ship (policy D2), a threat
sketch, risks — plus ADR-shaped decision records for every choice whose
reasoning the next person would otherwise reconstruct.

## When

Run after `/probe-spec` has produced a valid analysis and before
`/build-feature`. Rerun after a `--reconcile` that changed in-scope ACs — the
design cites AC ids, so the reconciliation report says exactly which sections
are stale.

## Where

Read the analysis and the active stack profile; write the design and decision
records under the feature's `60-design` artifact directory.

## How

Resolve the stack, delegate design to the tech-designer agent with the sliced
analysis, review the returned design for invention before persisting, write the
decision records, and end in one of the four D12 closing states.

## Procedure

1. **Resolve the stack** per the `--stack` rules in
   `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`, and record in the
   design header which stack was resolved and how. A provisional profile is
   named as such in the header, and every fact taken from it is direction, not
   evidence.
2. **Preconditions.** `10-spec/spec-analysis.md` exists and validates. If an
   in-scope AC carries an open question that controls its expected behavior,
   stop with `NEEDS_INFO`, listing the questions with the analysis's own
   recommended answers — a design built on a guessed requirement is rework
   wearing a design's clothes.
3. **Delegate to the tech-designer agent** with the analysis slice for the
   selected scope (`--ac` narrows), the resolved profile path, and the repo
   root when one exists. Token discipline: send AC definitions and category
   rows in scope, not the whole analysis.
4. **Review the returned design for invention** before persisting: every layer
   name traceable to the profile, every requirement claim to an AC id, every
   code claim to a file. An ungrounded claim goes back to the agent or becomes
   an open question — never silently into the design.
5. **Write the artifacts.** `tech-design.md` with the dimensions and their
   grounding labels; each decision record to
   `60-design/decisions/NNNN-<slug>.md`, numbered after the highest existing
   record. A decision that is really org truth routes to
   `/update-yieldwerx-knowledge` instead; a per-feature choice stays here.
6. **Update the ledger** (when the feature has one): a `Tech Design` note with
   the artifact link. The dev track stays gate-independent (D8) — this records
   progress, it does not create a gate.
7. **Close** in one D12 state. `COMPLETE` requires the design to cite zero
   ungrounded claims; open questions that do not block any in-scope AC ride
   along as notes.

## Boundaries

- **The analysis is the requirement; the design must not amend it.** A gap
  found while designing goes back through the spec's question flow, never
  silently into the design.
- **No implementation.** The design names files and layers; it does not write
  them. `/build-feature` implements, and discovers honestly where the design
  was wrong — those discoveries update the design, dated.
- **Producer before consumer.** A design spanning service and frontend
  sequences the service contract first, and says so.
