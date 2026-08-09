# API test design checks

Choose only checks supported by approved behavior and the reconciled contract:

| Area           | Checks                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Happy path     | Status, content type, runtime schema, business result                      |
| Input boundary | Required, nullable, enum, min/max, format, unknown fields                  |
| Authentication | Missing/invalid credential; separate from authorization                    |
| Authorization  | Approved role/scope matrix and tenant isolation                            |
| State          | Not found, conflict, invalid transition, concurrency                       |
| Reliability    | Idempotency, rate limits, safe retry, async terminal states                |
| Compatibility  | Required semantics; tolerate additions by default                          |
| Resiliency     | Deterministic timeout, transient failure, retry, malformed input, recovery |

- Keep transport in domain clients and schemas near the owning domain.
- Never share mutable tokens or records across workers.
- Generate traceable unique data and delete it in dependency-safe order.
- Assert status before parsing success schemas; model error schemas separately.
- Attach sanitized failure diagnostics, never credentials.
- Stub only deterministic frontend states unsafe or impractical to induce live.

## Portfolio routing

| Test family                   | Primary runner and classification                                     |
| ----------------------------- | --------------------------------------------------------------------- |
| Functional API                | Playwright typed client; `@api @testtype:api`                         |
| Contract                      | Playwright/OpenAPI/runtime schema; `@api @testtype:contract`          |
| Workflow/integration          | Playwright business Gherkin; `@api @testtype:api @api-workflow`       |
| Security baseline             | Playwright role/auth matrix; `@api @testtype:security`                |
| Performance/load/stress       | Route to `/forge-performance-tests`; k6; `@api @testtype:performance` |
| Resiliency                    | Deterministic Playwright cases; `@api @testtype:api @resiliency`      |
| Broad fuzzing/active scanning | Separate isolated authorized suite; never an ordinary PR run          |

Every HTTP-facing scenario carries `@api`, regardless of its primary
`@testtype:`. This routes API security cases correctly and makes the AIO
exclusion structural. Keep exactly one primary `@testtype:`.

## Gherkin altitude

Prefer `When the policy is created through the API` and `Then the policy can be
retrieved` over `When I POST /policies` and `Then status is 201`. Keep exact
status/header/schema requirements in case details and typed step assertions
unless the transport contract is itself the business requirement. Generate
domain bindings per discovered API; do not maintain a universal raw-HTTP step
library.
