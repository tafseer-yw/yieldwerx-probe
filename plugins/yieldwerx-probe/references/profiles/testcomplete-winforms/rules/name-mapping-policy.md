# Name Mapping policy — stable identity for desktop controls

The desktop's selector policy. `/desktop-recon` measures gaps against it,
`/forge-desktop-scripts` writes against it, and the dev track's D2 obligation
("testability is a build obligation") is what closes the gaps it finds.

## The identity ladder

When mapping a control, prefer identification criteria in this order:

1. **The developer-set control name** (`WinFormsControlName` for .NET
   controls) — the desktop's `data-testid`. It survives layout changes,
   translation, and restyling, because it identifies the control rather than
   describing its current appearance.
2. **A stable structural property** the vendor documents for that control
   class, combined with the named parent above it.
3. **Class + ordered index under a NAMED parent** — last resort, recorded as a
   gap in the recon artifact even when it currently works, because an index
   encodes today's layout.

Never acceptable as identity: a caption alone (display, not identity — breaks
on localization and on any window title that embeds state), coordinates, color,
or any property that encodes the control's current value or state. A trigger
named for its current selection resolves today and breaks silently tomorrow —
the same rule the web selector policy states.

## The compiler caveat that makes this a dev obligation

.NET compilers **omit a control's name from the executable when the developer
never assigned the `Name` property.** No mapping technique can recover an
identity that was never compiled in. Therefore:

- `/desktop-recon` reports every reachable control whose name is missing as a
  **testability gap**, routed to `/seed-testability` exactly like a missing
  `data-testid` on the web;
- a new WinForms control shipped without a `Name` is an unmet D2 obligation in
  that change — `build-verifier` reports it red, on the dotnet-legacy stack,
  the same way a missing web test id is red.

## Repository discipline

- **Aliases are the test-facing API.** Steps reference `Aliases.*` only; the
  Mapped Objects tree with its identification criteria is an implementation
  detail steps never touch. Collapse intermediate levels in the Aliases tree
  so a rename of a container does not ripple through every step.
- **One alias per control, named for its role** (`btnRunDetection`,
  `gridBinSummary`), not its caption and not its position.
- **Extended Find sparingly and deliberately** — it absorbs hierarchy changes,
  but over-broad extended finds match the wrong control the day a dialog gains
  a twin. Record why each extended find exists.
- **Conditional mapping only for genuine variants** (the same logical window
  with two captions across versions), with the variants named in a comment.
- Mapping changes are reviewed like code: a diff that rewrites identification
  criteria wholesale is the desktop's locator-churn smell and gets the same
  scrutiny.
