# Service conventions — `node-ts-spa`

The service-side obligations a dev-track change must meet on this profile.
`build-verifier` checks them mechanically; `code-reviewer` ranks the misses.

## API document parity

The application serves its own API document, and that document is **generated
from the same definitions the routes use**. A hand-maintained document beside the
code drifts, and drift is the defect class this rule exists to prevent.

Parity means, for every route:

- the path and method appear in the document;
- every status code the route can return is declared, including the
  unauthorized, forbidden, not-found, and validation-failure responses;
- required fields match what validation actually requires;
- **enum values match what the route actually accepts** — the single most
  expensive mismatch, because tests that derive their expected option set from
  the document then disagree with a screen that works;
- a route that no longer exists is removed from the document in the same change.

## Authorization

Every route declares the role it requires. Enforcement is on the route, not in
the frontend.

- an unauthenticated caller receives the unauthorized status;
- an authenticated caller below the required role receives the forbidden status;
- **neither response reveals whether the resource exists** — the same body for a
  real and an imaginary identifier;
- authorization is checked before the resource is loaded, so a probe cannot use
  response timing to learn what exists.

## Validation and refusal messages

Validation lives in one place per route and produces the exact message the
requirement specifies. A refusal message is part of the contract:

- the message is stated in the requirement, and the code reproduces it verbatim
  — including its punctuation, which is a real source of test churn when it
  drifts;
- messages are constants, not string literals scattered across handlers, so the
  frontend and the service cannot spell the same refusal two ways;
- a validation failure returns every violation it found, not only the first, so
  a caller can fix the whole request in one round trip.

## Persistence and integrity

- A write that spans more than one row is atomic. A failure halfway through
  leaves no partial record.
- Aggregates stay consistent with their parts. Where the requirement names an
  invariant — a sum that must equal a count — the code enforces it and a
  developer-owned test proves it directly against the store.
- Migrations are registered through the repository's own mechanism in the same
  change as the code that needs them.
- **Rows written before a change must still read correctly after it**, or be
  migrated in the same change. "They will be fine" is not a statement about
  existing data.

## Asynchronous work

- Every queued item reaches a terminal state: completed, failed with a recorded
  reason, or skipped with the criterion that did not match. Nothing is dropped.
- The terminal state is queryable, so a test can poll rather than wait a fixed
  duration.
- Work is idempotent under retry, or it declares an idempotency key the caller
  supplies.
- The lease is bounded, so a worker that dies does not strand the item.

## Determinism

Anything a test asserts must reproduce on a second run with the same input.

- No wall-clock read inside a calculated result. Pass the timestamp in.
- No unordered iteration where the output order is asserted. Sort explicitly and
  break ties on a stable key — the tie-break is part of the contract, not an
  implementation detail.
- No locale-dependent formatting on an asserted surface.
- Round at display only. Every derived value is computed from unrounded inputs,
  and the rounding rule is stated once.

## Readable results

Any calculated business value a test must assert is available without scraping a
rendering — in the response body, in a documented model field, or in a data
attribute beside the rendering. It is subject to the same role check as the
rendering it mirrors; a testability hook never widens what a caller may see.
