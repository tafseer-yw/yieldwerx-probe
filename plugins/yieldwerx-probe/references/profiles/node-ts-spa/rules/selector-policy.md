# Selector policy — `node-ts-spa`

The identifier contract between the application and its automation. This file is
the authority `/seed-testability`, `testability-scout`, and `code-reviewer` use
to decide whether an element is a gap. The consumer's own `.claude/rules/` remain
applicable; where both apply and agree, apply both. Where they conflict, stop
and report the exact conflict.

## The attribute

`data-testid`. One attribute, everywhere. A build that also carries `data-test`,
`data-cy`, or `data-qa` has three contracts and therefore none.

## The grammar

```
<surface>-<element>[-<qualifier>]
```

Lowercase, hyphen-separated, stable. `policy-form-name`, `policy-list-row`,
`signature-mode-select`, `wafer-map-legend-entry`.

Two rules make the difference between a contract and a coincidence:

1. **Never encode a value or a state.** `bin-source-hard` is wrong because the
   identifier changes when the user picks soft. State goes on the attribute the
   platform provides for it — `aria-pressed`, `aria-selected`, `aria-current`,
   `disabled` — and the identifier stays put.
2. **Never encode a position.** `row-3` is wrong because inserting a row above it
   silently retargets every assertion. Identify the row by its own identity, or
   give the container an identifier and let the test scope inside it.

## What must carry one

Every element a test needs to act on or assert against:

| Category | Examples |
| --- | --- |
| Inputs | text, number, date, checkbox, radio, select, file, paste area |
| Actions | buttons, links used as actions, row action icons, menu items |
| Containers | forms, sections, panels, dialogs, list and grid roots, chart containers |
| Rows and cells | the row root, plus any cell a test reads by name |
| Feedback | validation messages, toasts, status pills, badges, counters |
| **Empty and error states** | the panel shown when there is nothing to show |

The last one is the most frequently missed and the most expensive. A grid that
renders headers only when populated leaves its empty state with no contract at
all — and "shows the right columns with no rows" is exactly the case that is
cheapest to run and hardest to verify without one.

## What does not need one

Purely decorative elements, layout wrappers with no assertable content, and text
that is already uniquely addressable through a labelled ancestor that has an
identifier. Adding identifiers to everything is not the goal; adding them to
everything a test touches is.

## Ranking a gap

`testability-scout` and `code-reviewer` rank on what the gap costs:

| Rank | The gap |
| --- | --- |
| `high` | No stable handle at all, or a handle that encodes a value, a state, or a position. Includes any chart or result container without an identifier. |
| `medium` | Addressable only through its visible text, or only through a fragile ancestor chain. |
| `low` | Cosmetic, or already reachable through a stable identified neighbour. |

## The fallback order, when an identifier is genuinely absent

1. `data-testid` — the default, and the only one that is a contract;
2. an accessible role plus an accessible name that is the element's **label**,
   never its value — acceptable for genuinely semantic elements;
3. raw CSS, XPath, or text matching — **not acceptable**; it is a `high` finding
   in review, and the fix is in the application, not the test.

## Charts and rendered surfaces

A chart's internals go through the automation framework's own chart layer, but
the container still needs an identifier, and any value the chart encodes that a
test must assert needs a machine-readable route to it — a data attribute beside
the rendering, a field in the response, or a documented model property. A value
that exists only as pixels is unverifiable, and that is a build gap, not a test
limitation.
