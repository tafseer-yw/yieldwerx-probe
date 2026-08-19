---
name: forge-prd
user-invocable: true
description: Use when a feature idea, request, or problem statement must become a requirements document every stakeholder can read — an executive to know what they are paying for, a developer to know what to build, a QA to know what to check, from the same words. Clarifies before writing and never invents a product decision; writes the PRD into the configured requirements home with a draft → in-review → signed-off filename lifecycle where sign-off is a recorded human decision. The signed-off PRD is what /probe-spec treats as canonical. PROBE Requirements Forge, shared by both tracks.
track: shared
safety: writes-shared
produces: <prds-path>/<feature-slug>/prd-draft.md (renamed through the lifecycle, never copied)
consumes: the stated idea/request/problem, existing product knowledge via the configured provider, any prior notes the caller supplies
argument-hint: <feature-slug> [<the idea or problem, or a path to notes>] [--review | --sign-off "<name>"]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Requirements Forge (PRD)

## Why

Requirements written in engineering language exclude the people funding the
work, and requirements written in slideware exclude the people building it.
One document in plain product language — enforced, not advised — is what lets
an executive, a developer, and a QA agree on what was promised, and lets both
PROBE tracks start from the same truth.

## What

A PRD in the fixed template: the problem and its cost, what will be built in
the product's own words, user stories with stable `US-NN` ids and a plain-words
explanation each, scope and out-of-scope, success measures, open questions each
carrying a recommended answer, and a Terms table. Validated by
`validate-prd.mjs` before it is called done.

## When

Run at the very start of a feature — before `/probe-spec`, before any design.
Use `--review` to move a draft to in-review, and `--sign-off "<name>"` to
record a human's sign-off decision. Rerun on an existing PRD to amend it in
place with a revision note; ids are never renumbered.

## Where

Write to the configured PRDs home: `paths.prds` in `probe.config.yaml`, falling
back to `paths.requirements`. The recommended home is the organization's
knowledgebase working copy, so one authority serves every consumer; a
repo-local `docs/PRDs` works the same way for a single-repo product.

## How

Clarify first and refuse to assume; draft in the template with the language
rules enforced; validate; record lifecycle moves as renames; and treat
sign-off as a human decision Claude records but never makes.

**Language authority:**
[plain-language.md](../probe-spec/references/plain-language.md) — the same
rules, exemption lists, and Terms mechanism that govern `spec-analysis.md`,
enforced by the same shared checker. **Template authority:**
[references/prd-template.md](references/prd-template.md).

## Procedure

1. **Resolve the home.** `paths.prds`, else `paths.requirements`, else stop and
   ask — never guess where requirements truth lives. If
   `<prds-path>/<feature-slug>/` already holds a PRD at any lifecycle state,
   this run amends that file; never create a second.

2. **Clarify — refuse to assume.** Before writing a word of the document,
   gather what is actually known:
   - what the requester stated, kept in their terms;
   - what the configured knowledge provider confirms about the affected
     modules and vocabulary (context, never a requirement source — the same
     authority boundary Spec Probe enforces);
   - what nobody has decided yet.

   Product decisions are never invented. A missing decision — a limit, a
   default, a role, what happens on failure — becomes an Open questions row
   with a recommended answer and the reasoning, not a quietly chosen value.
   Where the answer is genuinely the owner's alone (a spend, a priority, a
   risk), the row says that instead of manufacturing a preference.

3. **Draft in the template**, every section, in this order of effort:
   - **Problem first**, and test it on three imagined readers: would the
     executive know the cost, the developer the context, the QA the stakes?
   - **Stories next** — each one behavior a user would recognize, with the
     **In plain words** line doing the explaining for readers outside the
     domain, and **Done means** statements in product words with exact values
     wherever the requirement knows them.
   - **Terms as you go**: every product label used is written exactly as the
     product writes it, and every term a newcomer would stumble on gets a row.
   - Scope and out-of-scope, success measures with numbers, open questions
     consolidated.

4. **Validate.** Run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/forge-prd/scripts/validate-prd.mjs <path>`
   (or the `probe validate-prd` CLI / `probe_validate_prd` MCP tool — same
   engine). Fix every error before reporting the draft; warnings are reported
   with the result.

5. **Record the lifecycle.**
   - A new document is born `prd-draft.md`, `State: draft`.
   - `--review`: rename to `prd-in-review.md`, set `State: in-review`, and say
     who should read it.
   - `--sign-off "<name>"`: only on a direct statement from that human in the
     current conversation. Rename to `prd-signed-off.md`, set
     `State: signed-off`, and record `Signed off by: <name> — <YYYY-MM-DD
     HH:MM>`. This is the same rule as every PROBE gate: **Claude records the
     human decision; Claude never makes it.** A bare "looks good" is not a
     sign-off — ask.
   - Every amendment after sign-off adds a Revision note line and returns the
     document to `in-review` unless the owner states otherwise; a silently
     edited signed-off PRD is falsified requirements truth.

6. **Hand off.** Report where the PRD lives, its state, the open-question
   count, and the next step: `/probe-spec <feature-slug> <prd-path>` once it is
   signed off — and that Spec Probe will record an unsigned source as a gap
   rather than refuse, so early analysis is possible but visible.

## Boundaries

- **The requester's words are the requirement; the knowledgebase is context.**
  Exactly Spec Probe's authority boundary, applied one document earlier.
- **No solution design.** Architecture, endpoints, tables, and components
  belong to `/forge-tech-design`. A PRD that names a database table has
  drifted; name what the user sees instead.
- **Ids are forever.** `US-NN` ids are never renumbered or reused; a story
  that no longer applies is marked superseded with its replacement named.
- **One PRD per feature.** Amend, rename, never copy — a stale twin is how two
  teams build two features.
