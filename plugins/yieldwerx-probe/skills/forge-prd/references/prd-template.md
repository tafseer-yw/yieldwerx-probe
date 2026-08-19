# PRD template

The fixed shape of a PROBE requirements document. `validate-prd.mjs` checks the
section names, the story format, and the language rules, so the headings below
are not renamed. Every section carries a one-line subtitle for first-time
readers, exactly as `spec-analysis.md` does.

The test of a finished PRD is simple: **an executive can read it and know what
they are paying for, a developer can read it and know what to build, and a QA
can read it and know what to check — from the same words.** Any sentence only
one of the three can follow is a defect.

## Lifecycle — the filename is the state

One PRD file per feature, renamed as it advances, never copied:

```
<prds-path>/<feature-slug>/prd-draft.md
<prds-path>/<feature-slug>/prd-in-review.md
<prds-path>/<feature-slug>/prd-signed-off.md
```

Renaming — not copying — means there is never a stale twin, and a link to a
draft breaks the day the draft stops being one, which is exactly what a link to
a draft should do. Sign-off is a **human decision recorded with a name and a
timestamp** in the Status section; Claude never advances the lifecycle on its
own.

## The template

```markdown
# PRD — <Feature Name>

## Status

The lifecycle state and who moved it there.

- **State:** draft | in-review | signed-off
- **Owner:** <the human accountable for this requirement>
- **Signed off by:** <name> — <YYYY-MM-DD HH:MM> (only in a signed-off PRD;
  blank rows are not pre-created)
- **Revision note:** <one line per material change, newest first>

## Problem

What hurts today, in plain words, and what it costs.

Two or three sentences a person outside the team can follow: who is affected,
what they cannot do or must do the slow way, and what that costs in time,
money, or risk. No solution language here — a problem statement that names a
feature is a decision wearing a disguise.

## What we will build

The change, described in the product's own words.

One short paragraph, then bullets if needed. Name screens, buttons, reports,
and modules by their visible labels. A reader should be able to say afterwards
what will exist that does not exist today.

## Who it is for

The roles that will touch this, and what each gets.

| Role | What this gives them |
| ---- | -------------------- |

## User stories

The behavior, one story at a time. IDs are stable forever.

### US-01 — <short name>

**As a** <role>, **I want** <capability>, **so that** <outcome>.

**In plain words:** One to three sentences for a reader with no domain
knowledge — what the thing is, why it matters, what they would see.

**Done means:** two to five short statements a QA could check, in product
words. These are sketches for Spec Probe's acceptance criteria, not Gherkin —
exact values where the requirement knows them, open questions where it does
not.

## Scope

What is included in this change.

## Out of scope

What is deliberately not included — named, so nobody discovers it in QA.

Write `None declared.` only when the omission is deliberate and considered.

## Success measures

How we will know it worked, in numbers where possible.

| Measure | Today | Target |
| ------- | ----- | ------ |

## Open questions

What must be settled before build or test can be trusted.

| Q | Question | Who can answer | Recommended answer | Why | Status |
| -- | -------- | -------------- | ------------------ | --- | ------ |

Every question carries a recommended answer and one line of reasoning — a
question without a stance hands the weighing back to someone with less context.
The recommendation is advice; the question stays open until a human settles it.

## Terms

The product's own words for the things in this document.

| Term (exactly as the product writes it) | Plain meaning | Where used |
| --------------------------------------- | ------------- | ---------- |
```

## Rules the validator enforces

- All sections above present, in this shape; the title line is
  `# PRD — <name>`.
- `US-NN` ids unique and never renumbered; every story carries the
  **As a / I want / so that** line, an **In plain words** explanation, and a
  **Done means** block.
- The plain-language rules of
  [plain-language.md](../../probe-spec/references/plain-language.md), applied to
  the Problem, What we will build, and every story: labels verbatim, no
  invented acronyms (the Terms table is the allowlist), no abbreviations, no
  vague words, no implementation jargon.
- `signed-off` state requires the **Signed off by** name and timestamp;
  a draft or in-review PRD must not carry one.
- A readability floor: an average sentence length above ~28 words draws a
  warning, because long sentences are the strongest single signal a document
  was written for its author rather than its readers.
