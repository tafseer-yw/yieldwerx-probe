---
name: desktop-recon
user-invocable: true
description: Use when the WinForms desktop application must be surveyed before desktop scripting — walks the screens the approved cases touch, harvests Name Mapping candidates with their identification properties, and reports every control with no developer-set Name as a testability gap routed to the dev track. The desktop twin of /ui-recon, against the testcomplete-winforms profile's Name Mapping policy. PROBE Desktop Recon stage (optional but strongly recommended before /forge-desktop-scripts).
track: scripting
safety: writes-local
produces: .probe/artifacts/<feature>/40-desktop-recon/desktop-recon.md, name-mapping-inventory.md, control-name-gaps.md, screenshots/
consumes: features/<feature-slug>/*.feature (approved permanent @manual scenarios), 20-cases/case-details.md, a reachable desktop build, the testcomplete-winforms profile
argument-hint: <feature-slug> [--build <id>] [--category CAT-NN]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Desktop Recon

## Why

Desktop scripting against unmapped objects rediscovers the application one
brittle hierarchy walk at a time. Reconnaissance first turns that into a
reviewed inventory — and surfaces the controls that cannot be mapped stably at
all, while they are one `Name` property away from being fixable by the dev
track instead of worked around forever by the QA track.

## What

Three artifacts: `desktop-recon.md` (the walk — screens visited, per approved
case, with screenshots), `name-mapping-inventory.md` (per control: proposed
alias, identification properties by the profile's identity ladder, and the
confidence in each), and `control-name-gaps.md` (every reachable control with
no developer-set `Name`, the compiler caveat made visible — the desktop's
`testid-gaps.md`).

## When

Run after the Design Gate approval, before `/forge-desktop-scripts` — exactly
where `/ui-recon` sits for the web. Rerun after a desktop build changes the
screens in scope; the inventory records the build it observed.

## Where

Walk the reachable desktop build; write everything under the feature's
`40-desktop-recon` artifact directory. Nothing is written into the
TestComplete project from here — recon proposes, scripting disposes.

## How

Read the approved cases' steps, walk each screen they touch in the desktop
build, record identification properties per the Name Mapping policy's ladder,
propose role-named aliases, and classify every control that only resolves by
class + caption + index as a gap.

## Procedure

1. **Preconditions.** A recorded human Design Gate approval covers the scope
   (the same rule as `/ui-recon`); a desktop build is reachable and its
   version recorded. This skill is normally run by a different team from the one
   that owns the cases, so `paths.features` and `paths.ledgers` usually point at
   a checkout of the QA repository — an unresolvable path is `BLOCKED` naming it,
   never guessed. Authority: the profile's **Operating model** section.
   TestComplete itself is not required for recon — the
   Object Browser is the best tool when available, but a manual walk
   recording captions, control roles, and observed names is valid recon and
   says which method produced it.
2. **Walk the approved scope.** For each in-scope case, visit the screens its
   steps name, capture a screenshot per distinct state, and record every
   control a step must touch or assert.
3. **Build the inventory.** Per control: the proposed alias (role-named, per
   the policy), the identification properties in ladder order with what was
   actually observed, the parent chain as the Aliases tree would collapse it,
   and a confidence note where identification relied on anything below ladder
   rung 1.
4. **Name the gaps.** Every control identifiable only by class + caption +
   index goes to `control-name-gaps.md` with the screen, the control's role,
   and the property the developer must set (`Name`). Route the list to
   `/seed-testability` — on the dotnet-legacy stack this is a D2 obligation,
   not a QA workaround backlog. The gap list crosses a team boundary (desktop
   QA finds it, development fixes it), so name the screen and control precisely
   enough to act on without a second conversation.
5. **Record open risks**: dialogs that appear only under data conditions recon
   could not produce, controls rendered by third-party grids with their own
   identification quirks, screens the build did not expose. These are the
   scripting stage's known unknowns, written down while they are cheap.
6. **Update the ledger**: Desktop Recon row with artifact links, build
   observed, inventory count, and gap count.

## Boundaries

- Recon observes; it never edits the TestComplete project, the application, or
  a case file.
- Observed behavior is evidence, never requirement truth (policy P12) — a
  screen that contradicts a case routes to the case flow as a finding.
- No shared environments; the build walked is a local or test installation,
  named in the artifact.
