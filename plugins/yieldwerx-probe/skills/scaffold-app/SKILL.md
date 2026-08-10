---
name: scaffold-app
user-invocable: true
description: Use once at the start of an application under test to stand up a runnable skeleton whose QA contracts exist from the first commit — a documented API surface, role-based authorization, a queryable datastore, a selector policy the frontend follows, and reset-and-seed control. Everything PROBE's recon and verification stages need, present before any feature is built. PROBE development track.
track: dev
safety: writes-code
produces: a runnable application skeleton with a served API document, authenticated roles, a datastore, seed and reset control, and a declared selector policy; .probe/artifacts/<app-slug>/70-build/scaffold-report.md
consumes: the chosen stack, the requirement package the application will implement, and the active profile
argument-hint: <app-slug> [--stack <profile-name>] [--surfaces api,ui,db,auth,queue] [--dry-run]
graph:
  consumes: [doc:requirement-source, profile:active, input:stack-choice]
  produces: [artifact:70-build/scaffold-report.md, code:service, code:frontend, doc:openapi, contract:selector-policy]
  delegates: [agent:requirement-clarifier, agent:build-verifier]
  next: [skill:build-feature, skill:seed-testability, skill:api-recon, skill:probe-implementation]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent. The stack profile named by `--stack` must be read
> explicitly; plugin reference files are not loaded for you.

# Scaffold App

## Why

Almost every expensive QA finding on a young application is really a missing
foundation: no API document to reconcile against, no roles so authorization has
no coverage at all, no way to reset state so scenarios contaminate each other,
and no selector policy so the first hundred controls ship unaddressable. Each is
trivial on day one and costs weeks once features are built on top. This skill
front-loads them, so the QA track has something to work with from the first
commit rather than a gap list.

## What

A small, runnable application skeleton with no business features and every QA
contract already present: a served API document, authenticated roles that are
actually enforced, a datastore a test can query, deterministic seed and reset
control, a declared selector policy the frontend follows, and one end-to-end
vertical slice proving all of it works together.

## When

Once, at the start of an application under test. Never on an application that
already exists — that is `/build-feature` for what is missing and
`/seed-testability` for what is unobservable.

## Where

A new or near-empty consumer repository. The scaffold report goes to the
configured `70-build` artifact directory.

## How

Confirm the stack and the surfaces, lay down each contract in dependency order,
prove the whole thing with one trivial vertical slice, and hand over the exact
commands the QA track will need.

## Preconditions — refuse if any fails

1. The target directory is empty or holds only repository furniture. Scaffolding
   over existing application code is refused:
   > "This repository already contains an application. Use `/build-feature` to
   > add capability, or `/seed-testability` to add missing contracts."
2. The stack is named, or the active profile declares one. Never choose a
   framework on the user's behalf; propose and ask.
3. New third-party dependencies require explicit human approval before install.
   Present the list with the reason for each and wait.
4. `--dry-run` writes nothing. It produces the plan and the dependency list only.

## Procedure

1. **Confirm stack and surfaces.** Read the requirement package well enough to
   know what the application must eventually do, then confirm the stack and the
   `--surfaces` set with the user. Delegate to the **requirement-clarifier**
   agent when the requirement package is large — the scaffold needs the shape of
   the domain, not its detail.
2. **Lay down the datastore.** The smallest real database the stack supports,
   with a migration mechanism from the first table. **A test must be able to
   query it directly** — an in-memory store that only the application can read
   removes an entire verification layer PROBE depends on. Include one seed
   dataset and a reset that returns it to a known state deterministically.
3. **Lay down authorization.** At least three roles with genuinely different
   reach, enforced on every route from the start. An unauthenticated caller
   receives the unauthorized status; an under-privileged caller receives the
   forbidden status; neither response reveals whether the resource exists.
   Retrofitting this is far harder than starting with it, and without it the
   security-baseline test family has nothing to cover.
4. **Lay down the API surface with its document.** One trivial resource, and the
   machine-readable API document served by the application itself — generated
   from the same definitions the routes use, so the two cannot drift. Record the
   document's URL in the scaffold report; `/api-recon` and `/forge-api-tests`
   both start from it.
5. **Lay down the frontend with its selector policy.** One screen, one form, one
   list, one empty state. **Write the selector policy down** — the attribute
   name, the naming grammar, and which elements must carry one — and follow it on
   every element in the skeleton, so the first contributor copies a correct
   example rather than inventing one.
6. **Lay down the asynchronous surface** when `--surfaces` includes it: a job
   that is queued, leased, and completed, with a queryable terminal state and a
   recorded reason for every failure. Tests need something to poll; more
   importantly, a build with no async surface has no honest place to exercise
   the polling and quarantine policies at all.
7. **Prove it with one vertical slice.** A single trivial capability that
   traverses every layer: authenticated request, validated input, persisted row,
   response matching the document, rendered on screen through the declared
   selectors. It exists to prove the wiring, and it is the reference every later
   feature copies.
8. **Verify.** Delegate to the **build-verifier** agent: the application starts,
   the slice works end to end, the served document matches the implemented
   routes, and the reset command genuinely restores the seed state.
9. **Report.** Write `70-build/scaffold-report.md`: the stack and why; every
   contract laid down and where it lives; the exact commands to install, start,
   seed, reset, build, typecheck, lint, and test; the API document URL; the
   selector policy; the roles and their credentials source; and the
   `probe.config.yaml` entries the consumer now needs so PROBE's stages resolve
   these commands rather than guessing.

## Boundaries

- **No business features.** The vertical slice is deliberately trivial. Real
  capability arrives through `/build-feature`, against an approved requirement.
- **Never invent the requirement.** The scaffold's shape may follow the domain,
  but no acceptance criterion is created here.
- **Never commit a secret or a machine-specific path.** Credentials come from
  environment configuration with a committed example file that contains no real
  values.
- **The API document is generated, never hand-maintained beside the code.** A
  document written by hand drifts, and drift is exactly the defect class this
  scaffold exists to prevent.
- **Reset must be safe by construction.** It refuses to run against any target
  that is not the configured local one, because a reset pointed at shared data
  is unrecoverable.
- Never scaffold over existing application code, and never commit to a
  deployment branch.
