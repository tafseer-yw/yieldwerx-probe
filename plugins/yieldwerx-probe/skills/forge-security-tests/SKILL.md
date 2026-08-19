---
name: forge-security-tests
user-invocable: true
description: Use when the OWASP Top 10:2025 categories a scanner cannot judge must become authored test cases — access control (A01), the abuse cases behind insecure design (A06), authentication behavior (A07), and security logging/alerting (A09), plus the authored half of A04/A05/A10. Designs Gherkin scenarios tagged @testtype:security and @owasp:ANN so coverage is reportable per category. The scanned categories are driven by /scan-security; this skill covers what only a human who knows the requirement can. PROBE Security Case Forge.
track: design
safety: writes-shared
produces: features/<feature-slug>/<category>-security.feature, .probe/artifacts/<feature>/20-cases/security-coverage.md
consumes: 10-spec/spec-analysis.md, 60-design/tech-design.md's threat sketch when it exists, references/security/owasp-2025.md
argument-hint: <feature-slug> [--owasp A01,A07,...] [--category CAT-NN]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Security Case Forge (OWASP 2025)

## Why

A scanner tells you a header is missing; it cannot tell you a pharmacist can
read another clinic's patients, because it does not know that is wrong. The
access-control, insecure-design, authentication, and logging categories are
decisions about what the system must refuse and record — they are authored
cases, and a coverage report that showed them as green scans would be lying.

## What

Gherkin scenarios for the authored OWASP 2025 categories, each tagged
`@testtype:security` and exactly one `@owasp:ANN`, plus `security-coverage.md`
mapping every category to authored cases, scanned coverage, or an explicit
`N/A — <reason>`. Repository-only, like all security scenarios.

## When

Run after Spec Probe, ideally after `/forge-tech-design` produced a threat
sketch (the abuse cases for A06 come straight from it). Alongside `/forge-cases`
— security cases are a dimension of the design, not a separate track.

## Where

`features/<feature-slug>/<category>-security.feature`, beside the functional and
API files; the coverage map under `20-cases`.

## How

Read the OWASP 2025 map and the threat sketch, design the authored categories'
cases against independent expectation, tag by category, and reconcile every
category to authored/scanned/`N/A` so the honest boundary is visible.

## The authored categories

Authority: [../../references/security/owasp-2025.md](../../references/security/owasp-2025.md).

- **A01 Broken Access Control** — for every owned resource: the role matrix
  (who may read/write/delete), horizontal escalation (one tenant/user reaching
  another's data — the healthcare-critical one), vertical escalation (a lower
  role reaching a higher operation), and IDOR (a guessed or altered identifier
  returning someone else's record). Expected result is always a refusal with
  the right status and no data leak — derived from the requirement's permission
  rules, never from what the app currently does.
- **A06 Insecure Design** — the abuse cases from the tech design's threat
  sketch: what a malicious or confused actor does with each operation, and the
  refusal the design commits to. If there is no threat sketch, that gap is the
  first finding.
- **A07 Authentication Failures** — session lifetime and invalidation, token
  handling, lockout on repeated failure, credential-reset flows, and what an
  unauthenticated caller receives. The scannable parts (weak TLS on the login
  endpoint) are left to `/scan-security` and cross-referenced.
- **A09 Security Logging and Alerting Failures** — assertions that security
  events (failed auth, access-control refusals, privilege changes) are logged
  with enough to investigate and are alertable. A QA case, because "should this
  be logged?" is a requirement question.
- **The authored half of A04/A05/A10** — a specific crypto rule the requirement
  states, an injection case on a field the spec marks sensitive, an
  exceptional-condition behavior (partial failure, resource limit) the design
  promises.

## Procedure

1. **Scope the categories** — `--owasp` narrows; default is every authored
   category applicable to the feature. Read the OWASP map and the threat
   sketch.
2. **Design against independent expectation.** Every security scenario's
   expected result comes from the requirement's permission/authentication/
   logging rules — the refusal, the status, the absent data — never from the
   application's current behavior. An access-control case that asserts "returns
   403 because it does today" proves nothing; it must assert "must return 403
   because clinic A may not read clinic B."
3. **Write the scenarios** to `<category>-security.feature`, procedural and
   business-readable, each tagged `@testtype:security` + one `@owasp:ANN` +
   scenario-type tags. Negative behavior dominates here — the case that the
   forbidden thing is forbidden.
4. **Reconcile coverage** in `security-coverage.md`: each of the ten categories
   → authored cases (with TC ids), scanned by `/scan-security`, or
   `N/A — <specific reason>`. A category left blank is a gap; a generic
   "covered by scanning" for an authored category is wrong and is flagged.
5. **Route the scannable categories** to `/scan-security` with a note of what
   authored coverage already exists, so the two do not duplicate and neither
   leaves a hole.
6. Run the configured `lintCases` command; update the ledger with the security
   `@testtype:` and `@owasp:` breakdown, recorded `AIO: n/a — repository-only`.

## Boundaries

- **Expected values are the requirement's, never the app's** — the self-passing
  rule is sharpest here, because a security test that mirrors current behavior
  certifies the vulnerability.
- Security scenarios are repository-only (`@testtype:security` is excluded from
  AIO). The `@owasp:` tag is the coverage dimension.
- This skill designs; it runs nothing. Active testing is `/scan-security`
  (tools) and `/forge-scripts`/`/forge-api-tests` (the authored cases'
  automation), each under its own authorization rules.
- Never weaken an assertion to make a security case pass — a failing
  access-control case is the finding, routed to `/bug-report`, not an edit.
