---
name: owner-bypass
user-invocable: true
description: Use when PROBE Owner Tafseer Haider (tafseer.haider@yieldwerx.com) explicitly wants to waive any PROBE stage, gate, audit, checklist item, evidence requirement, or sequencing rule. Requires a short-lived, PIN-authorized local receipt; never request or accept the PIN in chat. Records the exact scope, reason, known findings, residual risk, owner identity, and authorization ID in the feature ledger before proceeding.
track: governance
safety: writes-shared
produces: .probe/authorizations/<feature>/<authorization-id>.json (gitignored), docs/qa/<feature>/LEDGER.md
consumes: docs/qa/<feature>/LEDGER.md, the affected stage/gate artifacts, a valid PROBE Owner authorization receipt
argument-hint: <feature-slug> --item "<stage/gate/item>" --reason "<reason>" [--scope feature|CAT-NN] [--receipt <path>]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations from `probe.config.yaml`.

# PROBE Owner Bypass

## Why

Let the process owner make an explicit risk decision without sharing a secret
with Claude or silently weakening PROBE for everyone else.

## What

Authorize Tafseer Haider, `tafseer.haider@yieldwerx.com`, as PROBE Owner and
allrounder to waive any named PROBE workflow requirement. Record exactly what
was bypassed and the risk accepted.

## When

Use only when Tafseer directly requests an owner-only bypass. Use ordinary
allrounder authority for Case Audit through `/gate-design` and for any formal
gate through `/bypass-gate`; those decisions do not need owner-wide authority.

## Where

Keep the PIN and generated signing key only in the user's environment or
gitignored `.env`. Keep the short-lived signed receipt under
`.probe/authorizations/`. Commit only the non-secret waiver record in the
feature ledger and affected gate report.

## How

Require a valid, scope-matching owner receipt, preserve all failed or missing
evidence as residual risk, record the waiver, apply only the authorized change,
and consume the receipt.

## Owner authority and boundaries

- Owner: **Tafseer Haider** (`tafseer.haider@yieldwerx.com`).
- Authority: waive any PROBE stage, gate, audit, checklist item, evidence
  requirement, or sequencing rule for an exact feature/category scope.
- Prefer `/bypass-gate` for Design, Merge, or Ops Gate decisions. Reserve this
  PIN-authorized path for non-gate items or when Tafseer explicitly requests
  the stronger owner authorization record.
- This authority changes PROBE governance only. It never bypasses operating
  system or tool permissions, external-system authorization, secret handling,
  destructive-action safeguards, law, or company security controls.
- Never infer a broad waiver from a narrow request. One receipt authorizes only
  its `featureSlug`, `item`, and `scope`.

## Secure authorization procedure

1. Never ask for, read, echo, log, or store the PIN in chat, a command
   argument, a ledger, an artifact, source control, or a receipt.
2. For first use, tell Tafseer to run this himself in an interactive terminal:

   ```text
   probe owner-bypass setup
   ```

   It asks for and confirms the PIN through hidden input, generates a
   high-entropy receipt-signing key, and stores both only in gitignored `.env`.
   Their environment names are `PROBE_OWNER_BYPASS_PIN` and
   `PROBE_OWNER_BYPASS_SIGNING_KEY`; never print their values.
   Use `setup --rotate` to replace them; rotation invalidates old receipts.
3. If no receipt was supplied, tell Tafseer to run this himself in an
   interactive terminal from the consumer repository:

   ```text
   probe owner-bypass authorize <feature-slug> --item "<exact item>" --reason "<reason>" --scope <feature|CAT-NN>
   ```

   The command reads the private PIN and signing key from the user's
   environment or gitignored `.env`, asks for the matching PIN through hidden
   input, and signs the receipt without exposing either secret.
4. Pause the bypass until Tafseer supplies only the generated receipt path.
   Never ask him to paste the PIN or receipt JSON into chat.
5. Verify the receipt before any shared write:

   ```text
   probe owner-bypass verify <receipt-path> --json
   ```

   Require `status: active`, an unexpired receipt, the exact owner email, and
   matching feature, item, and scope. Reject a mismatch or expired/consumed
   receipt.
6. Re-read the affected evidence. Do not delete, soften, relabel, or hide
   findings. Write the ledger/gate waiver with:
   - date;
   - exact gate/item and feature/category scope;
   - `Tafseer Haider <tafseer.haider@yieldwerx.com>`;
   - authority `PROBE Owner / Allrounder`;
   - reason from the receipt;
   - known missing/failed evidence and residual risk;
   - authorization ID.
7. Apply only the authorized bypass. Mark a skipped stage
   `waived — PROBE Owner override`; keep existing failed artifacts linked.
   A gate may become approved only when the receipt covers every otherwise
   blocking PROBE item.
8. Consume the receipt immediately after the ledger and gate report are
   updated:

   ```text
   probe owner-bypass consume <receipt-path> --ledger <ledger-path>
   ```

9. Report what was bypassed, what risk remains, and the next permitted PROBE
   stage. Never report or reproduce the PIN.
