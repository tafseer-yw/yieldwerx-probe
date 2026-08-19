# Security-tool adapter contract

How `/scan-security` reaches a security tool, and what a consumer supplies to
plug a different one in. The same shape as the case-management adapter contract:
the skill is defined against **verbs**, and an engine is anything that performs
them — so a tool that floods you with false positives is swapped by
configuration, not by a rewrite.

## The five verbs

| Verb | Finds | Reads or attacks | Target authorization |
| --- | --- | --- | --- |
| `deps-scan` | vulnerable/malicious dependencies, lockfile CVEs, SBOM (A03) | reads the repo | none |
| `sast` | code-level flaws — weak crypto, injection sinks, integrity (A04/A05/A08) | reads the repo | none |
| `baseline-scan` | misconfiguration, headers, TLS, verbose errors (A02/A04) — passive | reads a running target | **names the target** |
| `api-scan` | injection and contract-level flaws via the OpenAPI spec (A05/A10) | **active** — sends attack traffic | **explicit, in the request** |
| `fuzz` | validation bypasses, crashes, schema violations via property-based generation (A05/A10) | **active** | **explicit, in the request** |

Two properties hold for every engine:

- **The read-only verbs (`deps-scan`, `sast`) need no target authorization** and
  can run on every change — they read the repository, they send no traffic.
- **The active verbs (`api-scan`, `fuzz`, and `baseline-scan` against a live
  target) send traffic** and are refused without explicit authorization for that
  exact target in the invoking request — never production without an approved
  window, never a shared environment casually. This is the same rule as a live
  AIO write and a k6 load run.

## Commands

Each verb maps to a consumer command; an unconfigured verb is reported
unavailable, never guessed:

| Verb | `probe.config.yaml` key |
| --- | --- |
| `deps-scan` | `commands.securityDeps` |
| `sast` | `commands.securitySast` |
| `baseline-scan` | `commands.securityBaseline` |
| `api-scan` | `commands.securityApiScan` |
| `fuzz` | `commands.securityFuzz` |

## The recommended free engines

Chosen on 2026 evidence, confirmed by a spike before they are trusted:

- **OWASP ZAP** — `baseline-scan` and `api-scan`. The Automation Framework is
  YAML-driven and OpenAPI-aware; the packaged baseline and api scans are the
  simplest entry, the framework the fuller one.
- **Schemathesis** — `fuzz`. Property-based generation from the OpenAPI schema;
  finds validation bypasses and crashes hand-written cases miss.
- **OSV-Scanner** — `deps-scan` per change (precise on lockfiles, low noise);
  **Trivy** for images/IaC/filesystem and SBOM breadth nightly.
- **Semgrep** — `sast`, with reachability analysis to suppress CVE noise where
  the vulnerable function is never called.

A commercial engine (StackHawk, Burp Enterprise, Snyk) implements the same
verbs behind the same command keys; the skill does not change.

## Output contract

Every engine's result normalizes to findings the skill can triage:

- **id** — the tool's finding id;
- **owasp** — the mapped `A01`…`A10` category (the skill maps when the tool
  does not);
- **severity** — mapped onto the PROBE ladder (`blocker`/`high`/`medium`/
  `low`/`info`); a wrong-data or auth-bypass finding is `blocker` regardless of
  the tool's own rating;
- **location** — file:line for code findings, URL+parameter for runtime;
- **evidence** — the request/response or code excerpt, secrets redacted;
- **confidence** — the tool's confidence, carried through so triage can weigh
  it.

## Evidence and secrets

Findings are written to the scan artifact with secrets, tokens, and any
PHI/PII redacted — a security report is the last place a leaked credential
should live. Raw tool output is archived alongside, redacted the same way.
