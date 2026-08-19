---
name: sync-styleguide
user-invocable: true
description: Use when implemented UI must be reconciled against the repository's own design authority — its STYLEGUIDE.md and machine-readable token source — and the drift reported: raw color values where tokens exist, off-scale spacing, unsanctioned component variants, contrast pairs outside the approved set, and screens that predate the current guide. Reads the repo's authority; never bundles or invents one. PROBE development track.
track: dev
safety: writes-local
produces: .probe/artifacts/<feature-or-scope>/70-build/styleguide-drift.md
consumes: the repository's STYLEGUIDE.md and token source, the implemented UI code, the configured design-check command when one exists
argument-hint: <feature-slug or --all> [--stack <profile-name>] [--fix]
graph:
  consumes: [doc:styleguide, code:frontend, profile:active]
  produces: [artifact:70-build/styleguide-drift.md, code:frontend?]
  delegates: [agent:build-verifier]
  next: [skill:review-code, skill:ship-change]
  scope: [repo:*]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Styleguide Sync (dev track)

## Why

A design system dies by a thousand small exceptions: one hardcoded color
because the token name was not at hand, one 13-pixel gap because 12 looked
tight. Each is invisible alone; together they are why enterprise products look
assembled from parts. This skill makes the drift visible while it is one diff,
not one redesign.

## What

`styleguide-drift.md`: every place the implemented UI disagrees with the
repository's own design authority, each finding citing the guide/token rule it
violates and the file:line that violates it — plus, with `--fix`, the
mechanical corrections applied (literal → token, off-scale → nearest step)
while judgment calls stay findings.

## When

Run before `/review-code` on any change with UI in it, or with `--all`
periodically to measure a screen inventory's drift. Not a substitute for design
review — this checks conformance to the recorded system, not whether the
design is good.

## Where

Read the repository's authority files and UI code; write the drift report
under the feature's `70-build` artifact directory.

## How

Locate the repo's authority, run its own design-check command when it has one,
sweep the changed UI for the drift classes below, and report each finding
against the rule it breaks — never against taste.

## Procedure

1. **Locate the authority.** The repository's `STYLEGUIDE.md` and its
   machine-readable token source (the active profile or repo `CLAUDE.md` names
   them). **The authority is repo-local and versions with the code; this
   plugin never bundles a copy of anyone's tokens.** No authority found →
   `COMPLETE_WITH_NOTES` saying exactly that, with the recommendation to
   create one — a drift report against an imagined guide would be taste
   dressed as findings.
2. **Run the repo's own check first** when configured (`commands.designCheck`)
   — its baseline and ratchet are authoritative; this skill extends, never
   replaces, them.
3. **Sweep the scope** (the feature's changed UI files, or all screens with
   `--all`) for the drift classes:
   - raw color literals where a token exists for that value or role;
   - spacing/size values off the guide's scale;
   - typography outside the declared faces/sizes/weights;
   - hand-rolled variants of components the guide's sanctioned set covers;
   - color pairs used for text/background that are not in the approved
     contrast pairs, where the guide declares them;
   - guide-versus-token disagreements — reported as a finding against the
     authority itself, never silently resolved by picking one (the same rule
     the design system's own reviewers follow).
4. **With `--fix`,** apply only the mechanical class: literal → the token that
   owns that value, off-scale → the nearest scale step **when the guide names
   one**. Anything requiring judgment — a color with no owning token, a
   component variant — stays a finding. Run the configured design-check and
   lint after fixing; delegate verification to **build-verifier**.
5. **Write `styleguide-drift.md`**: findings grouped by class, each with
   file:line, the rule cited from the authority, and fixed/open status. Close
   in one D12 state.

## Boundaries

- **Conformance, not aesthetics.** A finding must cite a rule the repo's
  authority actually states. "This looks off" is design review, not drift.
- Never edit the authority files from here; a wrong token is a finding routed
  to the design system's own change process.
- New-screen work should not need this skill afterwards — `/build-feature`
  builds against the guide from the start; this is the ratchet for what
  slipped and for screens that predate the guide.
