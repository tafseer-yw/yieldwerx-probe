# OWASP Top 10:2025 — coverage map for PROBE

The categories PROBE's security skills design cases and run scans against.
**This is the 2025 edition, not 2021** — two categories (A03, A10) did not
exist in the edition most tooling still names, and A03 is not a runtime scan at
all. Source: owasp.org/Top10/2025 (verified 2026-08-19).

## The ten, and how PROBE covers each

For every category: whether it is **authored** (a QA case a human designs,
because judging it needs the requirement) or **scanned** (a tool finds it), and
which engine drives it. Four categories cannot be found by any scanner — they
are decisions about the requirement, and the coverage report says so rather
than implying a green scan covered them.

| # | Category | Primary coverage | Engine |
| --- | --- | --- | --- |
| A01 | Broken Access Control | **authored** — role matrices, horizontal/vertical escalation, IDOR on every owned resource | authored cases (API/UI) |
| A02 | Security Misconfiguration | scanned — headers, TLS, verbose errors, default credentials, exposed admin surfaces | DAST |
| A03 | Software Supply Chain Failures | scanned — dependency/lockfile CVEs per change, image/IaC nightly, SBOM per release | dependency + image scanners |
| A04 | Cryptographic Failures | scanned + authored — transport/at-rest, weak algorithms, secrets in code | DAST + SAST |
| A05 | Injection | scanned — active scan + schema-driven fuzzing of every parameter | DAST + API fuzzer |
| A06 | Insecure Design | **authored** — abuse cases from the threat sketch, decided at `/forge-tech-design`, not found later | authored cases |
| A07 | Authentication Failures | **authored** + scanned — session, token, lockout, credential handling | authored + DAST |
| A08 | Software or Data Integrity Failures | scanned — deserialization, update integrity, CI/CD trust | SAST + image scanner |
| A09 | Security Logging and Alerting Failures | **authored** — assertions that security events are logged and alertable | authored cases |
| A10 | Mishandling of Exceptional Conditions | authored + scanned — error paths, partial failures, resource exhaustion | API fuzzer + authored cases |

## The honest boundary

**No scanner covers the Top Ten.** A01, A06, A09, and the judgment half of A07
and A10 are decisions about what the system should refuse, log, and design
against — a tool can tell you a header is missing; it cannot tell you a
pharmacist can read another clinic's patients, because it does not know that is
wrong. Those are authored cases, and a security coverage report that showed ten
green scan rows would be lying about four of them.

`/forge-security-tests` authors the authored rows; `/scan-security` drives the
scanned rows and triages what comes back. Both tag by category (`@owasp:A01`),
so coverage is reportable per category and the gaps are visible.

## Tagging

Every security scenario carries `@testtype:security` plus exactly one
`@owasp:ANN` category tag (a scenario spanning two categories is usually two
scenarios). These are repository-only, exactly like API and performance
scenarios — never pushed to AIO.

## The engines (adapter, not hardcode)

The skills drive tools through the contract in
[../integrations/security-tools.md](../integrations/security-tools.md), so any
engine is swappable by configuration. The recommended free starting set, chosen
on the 2026 evidence and confirmed by a spike before it is trusted:

- **DAST** — OWASP ZAP (Automation Framework, YAML-driven, OpenAPI-aware);
- **API fuzzing** — Schemathesis (property-based, generates from the OpenAPI
  schema — 1.4–4.5× the defects of comparable tools in one academic
  evaluation);
- **Dependencies / supply chain** — OSV-Scanner per change, Trivy for
  images/IaC/filesystem nightly, an SBOM archived per release;
- **SAST** — Semgrep (code-level, with reachability to cut CVE noise).

A commercial engine (StackHawk, Burp, Snyk) drops in behind the same contract;
the skills do not care which tool answers, only that it answers the verbs.

## Safety — active scanning is a live action

An active scan sends attack traffic. It is governed exactly like a live AIO
write or a k6 load run: **never against a target without explicit authorization
in the invoking request**, never against production without an approved window,
and never against a shared environment casually. A passive/baseline scan and a
dependency scan are read-only and need no target authorization. `/scan-security`
enforces this and refuses closed.
