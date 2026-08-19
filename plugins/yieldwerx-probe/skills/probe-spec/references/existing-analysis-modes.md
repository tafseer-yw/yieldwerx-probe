# Existing analysis modes

Read this reference only when `--migrate-format` or `--reconcile` is supplied.

## Shared safety rules

- Require an existing configured
  `.probe/artifacts/<feature>/10-spec/spec-analysis.md`.
- Record the old artifact path, revision when available, and SHA-256 hash
  before editing.
- Never renumber or reuse an existing `AC-NN`, `CAT-NN`, `AMB-NN`, `Q-NN`,
  `DER-NN`, or `OOS-NN`.
- Never delete a historical row. Keep it and use `removed` or `superseded`
  where the artifact format supports a status.
- Never edit feature files, test scripts, AIO cases, gate signatures, or run
  evidence. Route case changes to `/yw:update-cases`.
- Write
  `.probe/artifacts/<feature>/10-spec/spec-reconciliation.md` from the format
  below.
- Mark Spec Probe `in-progress` before writing. On failure, mark it `blocked`
  with the exact reason. Never leave stale `in-progress` state.

## `--migrate-format`

Use this mode only when the approved requirement meaning must stay unchanged.
Do not reread the PRD, consult current implementation, add domain rules, or
resolve old questions.

1. Read the existing analysis and record its hash.
   Require `Sources and revisions` to name the provided requirement as
   `Requirement source of truth`. If that authority is missing or unclear,
   stop and use `--reconcile`.
2. Keep every table row, ID, source, status, exact value, question, category,
   and product note unchanged.
   If an AC, ambiguity, or out-of-scope row cites a knowledgebase, handbook,
   domain map, or observed implementation as its requirement source, stop and
   use `--reconcile`; correcting requirement authority is not format-only.
3. For every active AC:
   - add exactly one `**Summary:** Verify that ...` line;
   - add exactly one `**In plain words:**` explanation, one to three sentences
     for a reader with no domain knowledge;
   - keep `**Format:** Workflow` or `**Format:** Simple Rule`;
   - keep an existing Workflow's meaning while placing it in one fenced
     `gherkin` block;
   - convert a Simple Rule checklist to `Given`, `When`, and `Then`;
   - keep every Simple Rule result as `must` or `must not`.
4. Add the `## Terms` section from the terms the existing analysis already uses:
   `Term (exactly as the source writes it) · Plain meaning · Source`. Take each
   term's spelling and its cited section from the existing analysis — this mode
   does not reread the requirement. If the analysis uses an acronym whose source
   cannot be established from what is already recorded, that is a signal the
   analysis coined it: write the words out and note the expansion you used. If
   the expansion is not derivable either, stop and use `--reconcile`.
5. Expand abbreviations and invented short forms into the words already present
   elsewhere in the analysis. This is presentation, not meaning: `config` becomes
   `configuration` and a coined `CDM` becomes `Cluster Detection Mode` only when
   the long form already appears in the analysis. Never guess an expansion — an
   unresolvable short form means the meaning was never recorded, which is a
   `--reconcile` problem.
6. Use only nouns, context, actions, and results already present in the old
   analysis. For a static rule with no stated product action, use a neutral
   check such as `When The rule is checked`; do not invent a click, screen,
   message, permission, or product event.
7. Compare each AC before and after. Classify it as `format-only` or
   `unchanged`. Adding a summary, a plain-words explanation, the Terms table, or
   expanding an abbreviation is `format-only` — none of them changes what the
   product must do. If any AC needs a new value, condition, result,
   interpretation, or source, stop and tell the user to run `--reconcile`.
8. Run the Spec Probe validator and the reconciliation validator.
9. Set the report result to `format-only`, or `no-change` if nothing changed.
   Keep every downstream stage status and human signature unchanged. Add the
   report link to the ledger's Spec reconciliations table.

## `--reconcile`

Use this mode when the approved source may have changed, or when the old
analysis may have missed or misread a requirement. Require the complete
approved source and its revision. A partial amendment cannot prove that an
omitted requirement was removed.

1. Read the old analysis first. Build an inventory of every stable item and
   its source.
2. Digest the supplied approved requirement using the normal source-digester
   contract. Use knowledge only for terminology and business context. It cannot
   add or complete a requirement. Current implementation remains evidence only
   and never becomes requirement truth.
3. Match old and new requirements by source and pass/fail meaning:
   - `unchanged`: same meaning and same format; keep the ID;
   - `format-only`: same meaning, only the current AC structure changed; keep
     the ID;
   - `added`: genuinely new item; allocate the next unused ID;
   - `removed`: the complete approved source no longer contains the item; keep
     its old ID and mark it removed;
   - `meaning-changed`: the expected value, condition, action, or result
     changed; mark the old AC superseded and allocate a new AC ID;
   - `superseded`: the source explicitly replaced an item; keep the old ID,
     mark it superseded, and allocate a new ID for the replacement.
4. Never retain one AC ID across a meaning change. Record
   `AC-old → AC-new` in the change register.
5. Do not infer removal from silence in a partial source. Record an open
   question and leave the old item active until a human confirms the scope.
6. Rebuild only the affected analysis content. Preserve unchanged wording and
   ordering where possible so the diff shows the real change.
   Every `AC`, `AMB`, and `OOS` source cites the supplied approved requirement,
   never the knowledgebase or implementation.
7. Record every old and new AC exactly once in the change register. Record
   changed `CAT`, `AMB`, `Q`, `DER`, and `OOS` items too.
8. Determine downstream impact:

   | Change                             | Required action                                                                      |
   | ---------------------------------- | ------------------------------------------------------------------------------------ |
   | `unchanged`, `format-only`         | No case, audit, gate, script, run, or sync invalidation                              |
   | `added`                            | Route the new AC to Case Forge or the developer hand-off                             |
   | `removed`                          | Route linked cases to Update Cases for retirement; review AIO sync and coverage      |
   | `meaning-changed`, `superseded`    | Route linked cases to Update Cases; the Design Gate needs a fresh decision           |
   | changed expected value or boundary | Mark linked exploratory, automated, visual, and green-run evidence stale after cases |

9. Do not erase a human signature. Add a dated ledger reconciliation row that
   names affected ACs and says which evidence now predates the source change.
   Later gates must treat that evidence as stale until the routed work finishes.
10. Run the Spec Probe validator and the reconciliation validator. Set Spec
    Probe `done` only when both pass. If `--compare-implementation` was
    supplied, run Implementation Probe afterward against the reconciled ACs.

## Reconciliation report format

```markdown
# Spec reconciliation — <Feature Name>

## Summary

- **Mode:** migrate-format | reconcile
- **Result:** no-change | format-only | substantive | blocked
- **Feature:** <feature-slug>
- **Run date:** <YYYY-MM-DD>

## Sources compared

- **Existing analysis:** <path>
- **Existing analysis revision:** <revision or N/A with reason>
- **Existing analysis SHA-256:** <64 lowercase hex characters>
- **Approved source:** <path/reference, or "Not reread — format-only mode">
- **Approved source revision:** <revision, or "N/A — format-only mode">

## Change register

| Item          | Change          | Old source | New source | Reason                     | Downstream action                            |
| ------------- | --------------- | ---------- | ---------- | -------------------------- | -------------------------------------------- |
| AC-01         | format-only     | §3.1       | §3.1       | Added current AC structure | None                                         |
| AC-02 → AC-09 | meaning-changed | §3.2       | §3.2       | Allowed values changed     | Run `/yw:update-cases --ac AC-02 --ac AC-09` |

Allowed changes: `unchanged`, `format-only`, `added`, `removed`,
`meaning-changed`, `superseded`.

## Downstream impact

- **Cases:** <None or affected AC/TC IDs and next action>
- **Design Gate:** <Still current, or the exact scope needing a fresh decision>
- **Scripts and run evidence:** <None or stale items>
- **External case sync:** <None or keys/items to resync>

## Validation

- **Spec analysis validator:** pass | fail
- **Reconciliation validator:** pass | fail
- **Unresolved questions:** <count and Q-NN IDs, or 0>
```

Run:

```text
node ${CLAUDE_PLUGIN_ROOT}/skills/probe-spec/scripts/validate-spec-reconciliation.mjs .probe/artifacts/<feature>/10-spec/spec-reconciliation.md
```

The report is evidence, not permission to amend cases. Run `/yw:update-cases`
for every routed existing case change.
