# Node service + TypeScript SPA profile (`node-ts-spa`)

Load this profile only when `probe.config.yaml` selects `node-ts-spa`. It
describes an application under test built as a Node/TypeScript HTTP service with
a documented API, a relational datastore, and a single-page frontend.

- `rules/selector-policy.md` — the identifier contract the frontend must follow.
  `/seed-testability`, `testability-scout`, and `code-reviewer` all resolve
  "what counts as a gap" from this file.
- `rules/service-conventions.md` — the service-side obligations: API-document
  parity, authorization, validation and refusal messages, asynchronous work,
  and determinism.

Consumer commands remain authoritative. This profile never assumes a script
exists merely because a stack usually has one; every command is resolved from
`probe.config.yaml` under `commands`, and an absent command is reported
unavailable rather than guessed.

## What this profile expects the consumer to configure

| Purpose | `probe.config.yaml` key |
| --- | --- |
| Install dependencies | `commands.install` |
| Start the application locally | `commands.appStart` |
| Seed the known dataset | `commands.appSeed` |
| Reset to the seeded state | `commands.appReset` |
| Build / compile | `commands.build` |
| Type check | `commands.typecheck` |
| Lint | `commands.lintCode` |
| Developer-owned tests | `commands.unitTests` |
| Served API document location | `integrations.api.documentUrl` |

A dev-track skill that needs one of these and does not find it says so and
stops. It does not invent an equivalent.

## Layering

The two halves are reviewed against different obligations, so keep them
separable:

```
service/   routes → validation → authorization → domain → persistence
           the API document is generated from the same definitions the routes use
web/       screens → components → data access
           every assertable element carries the identifier the selector policy defines
```

A change that crosses the boundary sequences the producing side first: the route
and its document entry land before the screen that calls it.

## Determinism obligations

Anything a test will assert against must be reproducible on a second run:

- no wall-clock read inside a calculated result — pass the timestamp in;
- no unordered iteration where the output order is asserted — sort explicitly,
  and break ties on a stable key;
- no locale-dependent number or date formatting on an asserted surface;
- a fixed rounding rule, applied at display only, with every derived value
  computed from unrounded inputs.

## Traps recorded from live YieldWerx builds

These are real failure modes observed during PROBE recon passes on this stack.
They are recorded here so a build on this profile does not reproduce them.

- **An enum hardcoded in the frontend bundle while the service's metadata
  endpoint declares a different set.** The frontend never calls the endpoint, so
  the drift is invisible from the screen and only appears when a test derives
  its expected option list from the API. Generate both from one definition.
- **A trigger whose accessible name is its own current value.** It resolves
  today and breaks the moment a user changes the selection. Give it a stable
  identifier and leave the value in the element it labels.
- **A grid that renders its column headers only when it has rows.** The empty
  state then has no contract at all, and every "shows the right columns" case
  becomes unverifiable exactly when it is cheapest to verify.
- **A result surface that exists only as a raster rendering.** Per-item values
  become unreadable at any DOM depth, and the whole coordinate-level verification
  layer disappears. Ship the machine-readable equivalent beside it.
- **A pluralised or shortened label changed on one screen and not the other** —
  the same concept spelled two ways on one form. Name the concept once and reuse
  the constant.
