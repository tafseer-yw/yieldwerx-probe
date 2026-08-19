# Profile: dotnet-modern — PROVISIONAL

Load this profile when the work targets a new-build .NET service on the
platform's modernization path. **No repository stands behind this profile yet.**
Every skill that loads it must say so in its artifact
(`stack: dotnet-modern (provisional)`), and nothing here may be treated as a
verified fact about existing code.

## Why this profile exists at all

The knowledgebase records the direction (handbook §7.9 and Chapter 15): the
platform is moving toward **REST on a single gateway**, retiring the legacy WCF
services; **zero-trust security** — authenticate and authorize every call, even
internal ones; **rules-as-configuration** rather than code, with versioned,
audited rules and results that reference the exact version that ran; and
providers behind clean interfaces so a new module is rows plus providers, not a
rewrite. A design produced for this stack must be consistent with that recorded
direction, because it is the one thing about the stack a human has actually
approved.

## What a design against this profile must carry

Because there is no code to conform to, the design itself carries the
obligations a mature repo would impose:

1. **Contract first.** The API contract (OpenAPI) is part of the design, not an
   afterthought of the implementation, and the served document must match it.
2. **Zero-trust by default.** Every endpoint states its authentication and
   authorization explicitly; "internal, so unauthenticated" is a finding.
3. **Versioned and audited.** Configuration that changes behavior is versioned;
   results reference the version that produced them; changes are attributable.
4. **Testability from commit one** (PROBE policy D2): stable identifiers on
   every assertable surface, the API document generated from the same
   definitions the routes use, calculated values readable without scraping a
   rendering.

## Commands

| Purpose | `probe.config.yaml` key |
| --- | --- |
| Build | `commands.build` |
| Run locally | `commands.appStart` |
| Developer-owned tests | `commands.unitTests` |
| Lint / format check | `commands.lintCode` |
| Database migration apply | `commands.dbMigrate` |
| Served API document location | `integrations.api.documentUrl` |

## Graduating this profile

The first real repository on this stack replaces this file with verified facts:
actual solution layout, actual framework versions, actual layer names, actual
test project conventions, and the traps that repo teaches. Until then, a skill
must not cite this profile as evidence of how existing code works — it is a
statement of intent with a human-approved direction behind it, nothing more.
