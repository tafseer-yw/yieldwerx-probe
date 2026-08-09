# API inventory contract

Use one row per HTTP operation:

| Field | Required content |
| --- | --- |
| Operation | Stable operation id or generated `METHOD path-template` |
| Method + path | Uppercase verb and normalized path template |
| Purpose | Business behavior, not a restatement of the URL |
| Provenance | Spec pointer and/or capture, UI case, timestamp |
| Reconciliation | `confirmed`, `spec-only`, `observed-only`, `conflicting`, or `unresolved` |
| Authentication | Scheme and required role/scope; never credential values |
| Request | Path/query/header/body shape, content type, required fields, constraints |
| Responses | Status, content type, schema, and headers relied on by tests |
| Semantics | Side effects, idempotency, retry safety, concurrency/preconditions |
| Dependencies | Setup data, prior operation, async job/event, cleanup operation |
| Coverage | Approved TC ids and observed UI paths |
| Confidence | `high`, `medium`, or `low` with a reason |

Replace credentials, cookies, tokens, keys, passwords, signed parameters,
emails, and customer identifiers with typed placeholders. Inspect URL
parameters and bodies as well as headers.

Swagger/OpenAPI is declared intent, not proof of deployment. Captured traffic
is runtime evidence, not proof of every accepted value or possible response.
Record conflicts; never widen schemas merely to hide drift. Separate business,
authentication, authorization, validation, concurrency, throttling, and
infrastructure failures. Identify setup and cleanup dependencies.
