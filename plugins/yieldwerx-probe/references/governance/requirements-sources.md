# External requirement sources

The framework does **not** require production PRDs, stories, or specifications
to live in this repository. Files under `docs/PRDs/` are worked-example inputs
for the bundled demo only.

Requirements are a **design-time input** to PROBE. Playwright execution uses
the reviewed feature files, steps, fixtures, and test code produced from that
design work. Smoke and regression runs must not depend on a live PRD repository
being available.

## Production model

```text
External requirement source
        ↓ authenticated fetch or approved export
Pinned local input + provenance
        ↓ PROBE Spec Probe analysis
Reviewed cases, features, and traceability
        ↓
Playwright execution → Jenkins → Allure
```

The source may be another Azure DevOps repository, Jira, Confluence,
SharePoint, or an approved exported file. Before `/probe-spec` starts, provide
a stable input and record:

- requirement or story ID;
- source system and repository/project;
- source path or URL;
- branch, tag, or commit revision when applicable;
- retrieval date;
- content hash when audit reproducibility is required.

Example provenance:

```json
{
  "requirementId": "YWWM-CLUSTER-001",
  "source": {
    "provider": "azure-repos",
    "repository": "product-requirements",
    "path": "wafer-map/cluster-detection.md",
    "revision": "a1b2c3d4",
    "contentHash": "sha256:..."
  },
  "automation": {
    "feature": "features/wafer-map/cluster-detection.feature",
    "tags": ["@wafermap", "@regression"]
  }
}
```

## Operating rules

1. **Pin the input.** Analyze a known revision, not a moving target.
2. **Keep credentials outside Git.** Use read-only Jenkins or operator
   credentials for external sources.
3. **Do not couple test execution to the PRD host.** Fetch requirements in a
   specification/change-impact workflow, not during every smoke run.
4. **Trace by stable ID.** Reference requirement IDs and provenance rather
   than assuming a `docs/PRDs/...` path.
5. **Review changes.** A changed PRD triggers impact analysis and human review;
   it must not silently regenerate and merge tests.
6. **Respect ownership.** Commit a PRD snapshot only when its owner and audit
   policy permit it. Otherwise commit provenance and reviewed derived outputs.

## Recommended CI separation

```text
Requirements sync / PROBE design job
  → fetch exact external revision
  → record provenance
  → run specification and change-impact workflows
  → publish review artifacts

E2E execution job
  → checkout reviewed test code
  → run quality gates and tests
  → publish JUnit, Allure, and Playwright evidence
```

This keeps the test gate deterministic even when an external requirements
system is unavailable.

If a source must be downloaded for analysis, use an ignored directory such as
`.requirements-cache/` or a temporary location outside the repository. Never
store PATs, session tokens, or unapproved confidential documents with the
automation source.

The bundled `docs/PRDs/wafer-map-cluster-detection.md` remains a stable worked
example; it is not a rule about where real YieldWerx requirements must live.
