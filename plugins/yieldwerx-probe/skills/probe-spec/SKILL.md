---
name: probe-spec
user-invocable: true
description: Use when starting QA work on a new feature, analyzing a provided PRD/story/specification, migrating an older spec-analysis artifact to the current AC format, or reconciling an existing analysis with a revised approved requirement document — treats the provided requirement package as the sole requirement source of truth; uses the YieldWerx knowledgebase only for terminology and business context; writes every acceptance criterion with a "Verify that ..." summary, a plain-words explanation for a reader with no domain knowledge, and Given/When/Then steps; copies every control and product name verbatim from the source and never invents an acronym; preserves stable IDs and reports downstream impact. The shared entry point of BOTH tracks: dev and QA read the same analysis, and whoever runs it second reads the existing artifact rather than regenerating it. PROBE Spec Probe stage.
track: cross
safety: writes-local
produces: .probe/artifacts/<feature>/10-spec/spec-analysis.md, optional .probe/artifacts/<feature>/10-spec/spec-reconciliation.md, docs/qa/<feature>/LEDGER.md
consumes: PRD / user story / spec document (path or pasted text), optional existing spec-analysis.md
argument-hint: <feature-slug> [<spec-path-or-text>] [--migrate-format | --reconcile] [--compare-implementation <env-or-url>] [--role <role>] [--build <id>]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Spec Probe

## Why

Make requirements testable before case design begins and expose unclear wording,
missing PRD details, and unverifiable expectations while they are inexpensive
to resolve.

## What

Distill the specification into stable Workflow and Simple Rule ACs. Give every
AC a short `Verify that ...` summary, a plain-words explanation a reader with no
domain knowledge can follow, and simple Given/When/Then steps. Also record the
source's terms verbatim, categories, unclear wording, questions, product/test data
needs, places to check, test levels, and a feature ledger. Use the knowledgebase
only to understand YieldWerx words and business context.

## When

Run at the start of every new feature. Use `--migrate-format` for an old
analysis whose meaning must stay unchanged. Use `--reconcile` for an existing
analysis that must be compared with its approved source. Add the
implementation-comparison option when a reachable build should be checked.

## Where

Read the supplied requirement as the source of truth and use configured
knowledge only as reference context; write
`10-spec/spec-analysis.md` and the ledger in the consumer's configured paths.

## How

Digest the source without inventing behavior, classify each AC as Workflow or
Simple Rule, add its `Verify that ...` summary and `In plain words` explanation,
write its Given/When/Then steps in short QA-friendly words using the source's own
labels verbatim, assign stable IDs, mark unknowns as TODOs/questions, keep every
requirement traceable to the provided document, validate the artifact, and
optionally chain Implementation Probe.

**Plain-language authority:**
[references/plain-language.md](references/plain-language.md). Read it before
writing any AC, category name, or question. It carries the verbatim-label rule,
the acronym allowlist and its exemptions, the rejected abbreviations, and worked
before/after examples. The validator enforces it.

Ingest the specification and make it testable. This is the entry point of
every PROBE cycle: it also creates the feature ledger.

## One analysis, two tracks

`spec-analysis.md` is **jointly owned by the dev and QA tracks** and there is
exactly one of it per feature. The property that makes that work is already
enforced below: an unqualified rerun on an existing analysis **fails closed**,
so whoever runs Spec Probe second — dev or QA — gets the first run's analysis,
not a second opinion. Three rules keep the joint ownership honest:

- **Neither track regenerates it.** The QA track designs cases from it; the dev
  track designs the technical solution from it (`/forge-tech-design`). A
  requirement change goes through `--reconcile`, which preserves stable IDs and
  reports downstream impact **to both tracks at once** — stale cases on one
  side, a stale tech design and build on the other.
- **The ledger records who ran it.** Step 1 below stamps the runner
  (`Run by: <name> — dev track | QA track`) so the second reader knows the
  analysis exists and whose questions are already in it.
- **When a signed-off PRD exists in the knowledgebase, it is the canonical
  source.** Cite it with its lifecycle state. A `draft` or `in-review` PRD may
  be analyzed, but the analysis records
  `Requirement source of truth: <PRD> — NOT signed off` and the Design Gate
  digest carries that as a gap; never silently treat an unsigned PRD as
  approved.

## Inputs

- **feature-slug**: kebab-case (e.g. `policy-version-approval`). Ask if absent.
- **spec**: file path, pasted text, or ticket reference. Refuse politely if
  there is no spec in normal or `--reconcile` mode — PROBE does not start from
  vibes. `--migrate-format` does not reread the source.
- **migrate-format** (optional): update only the presentation of an existing
  `spec-analysis.md`. Its meaning and downstream evidence must not change.
- **reconcile** (optional): compare an existing `spec-analysis.md` with the
  supplied approved source, preserve stable IDs, and report every change and
  downstream action.
- **compare-implementation** (optional): a reachable environment name or URL.
  This requests the separate Implementation Probe after Spec Probe completes.
  Pass `--role` and `--build` when they are known.

## Existing analysis modes

`--migrate-format` and `--reconcile` are mutually exclusive. If
`spec-analysis.md` already exists and neither flag is supplied, stop before
writing and ask the user to choose a mode. Never silently regenerate an
existing analysis.

When either flag is supplied, read and follow
[Existing analysis modes](references/existing-analysis-modes.md) before the
procedure below. Its mode-specific steps override the normal creation steps
where they differ. `--compare-implementation` may follow `--reconcile`, but it
must not be combined with `--migrate-format`.

## Procedure

1. If `docs/qa/<feature>/LEDGER.md` does not exist, create it from the
   [ledger template](references/ledger-template.md). Read that reference when
   creating the ledger or adding a reconciliation row. Whether new or existing,
   mark Spec Probe `in-progress` before analysis, and record the runner and
   track (`Run by: <name> — dev track` or `— QA track`) in the stage row's
   Artifact/notes cell so the other track can see the analysis exists. On an
   unrecoverable
   missing-source/research failure, mark it `blocked` with the reason; never
   leave stale `in-progress` state.
2. **Fork the heavy read (PROBE policy P7 rule 3).** Do not load the raw
   PRD/story into this context. Delegate it to the **source-digester** agent
   with this digest contract: "return every testable requirement with its
   exact section/page in the provided requirement. For a user or system flow,
   capture the starting situation, action, and expected result. For a simple
   limit, layout, data, or performance rule, capture the exact rule and value.
   Quote verbatim any sentence with more than one reading; list every control,
   screen, field, tab, button, status, message, and product term the requirement
   names, **exactly as the requirement writes it** — same words, same
   capitalisation, same spacing — with the section where each appears, and note
   which of them the requirement itself abbreviates or gives an acronym for; list
   the YieldWerx domain words and modules named, without importing behavior from a
   handbook or knowledgebase; quote verbatim anything the requirement explicitly
   declares out of scope, deferred, a non-goal, 'will not do', 'future', or
   'phase 2'; note anything the requirement is silent on as `TODO(spec)`."
   Work from the returned digest. For a short pasted spec that already fits,
   skip the fork and read it directly. If the named helper is unavailable,
   perform one narrow local read using the same digest contract. For ticket
   references, retrieve the ticket with an available connector/API; if access
   is unavailable, mark the stage blocked and name the missing access rather
   than treating it as an empty specification.
3. From the digest, pull out four lists. Give every item a number that **never
   changes** afterwards, because later stages refer to these numbers.

   - **What the product must do** — `AC-NN` (acceptance criteria). Give one
     stable ID to each requirement that can pass or fail on its own. Always note
     where you found it (section or page).

     Choose the format by asking one simple question:

     > Does something happen after a user or system action?
     - **Yes — Workflow.** Write the AC with `Given`, `When`, and `Then`.
       Use this for user journeys, actions, state changes, permissions, jobs,
       messages, and other event-driven behavior.
     - **No — Simple Rule.** Still write the AC with `Given`, `When`, and
       `Then`. Use a small, truthful context and action. State each expected
       rule with `must` or `must not`. Use this for UI layout, allowed values,
       limits, calculations, data rules, and measurable non-functional
       requirements.

     Choose the format **for each AC**, not once for the whole feature. If a
     workflow depends on a separate rule, give both their own AC IDs and link
     them. A Workflow AC states the business flow; it is not the detailed test
     case that Case Forge writes later.

     Before the Gherkin for **every** AC, add two lines in this exact order and
     shape:

     `**Summary:** Verify that ...`

     `**In plain words:** <one to three sentences>`

     The summary states the result a QA will check, in one sentence of twenty words
     or fewer. The `In plain words` line explains the criterion to a competent
     reader with **no domain knowledge** — what the thing is, why it matters, and
     what a tester would see. Name the domain terms there and explain them in full
     sentences; it is the one place a full explanation of `hard bin`, `inking`, or
     `notch` belongs. It must add understanding, not restate the summary.

     Both Workflow and Simple
     Rule ACs use a fenced `gherkin` block with `Given`, `When`, and `Then`.
     Do not invent a click, screen, or system event just to make a Simple Rule
     look like a workflow. Use the smallest context and action that the source
     supports.

     Careful: write down only what the spec _says_. If the spec never mentions an
     error message, a permission, or an empty screen, you may not add it here —
     even when it obviously ought to work that way. Put those in the
     **Worth considering** list (`DER-NN`) instead, and if a test case would
     depend on one, also raise a question (`Q-NN`) so a human confirms it.

   - **Sentences that could mean two things** — `AMB-NN`. Quote the sentence
     word-for-word, say where it is, and spell out each way it could be read.
     Don't guess which reading is right. If a question is needed to settle it,
     the `Q-NN` points at the `AMB-NN` instead of repeating the text.
     Note the difference: text that is _unclear_ is an ambiguity; information
     that is simply _missing_ is a question or a `TODO(spec)`, not an ambiguity.
   - **What the spec says is not included** — `OOS-NN`. Only where the spec itself
     says something is out of scope, a non-goal, deferred, "future", or "phase 2".
     Quote its words and say where. Two traps: don't invent exclusions, and don't
     list something merely because the spec forgot to mention it (that is a
     `TODO(spec)` gap). Mark it `deferred` if a later release may still do it.
   - **Questions the team must answer** — `Q-NN`. Anything that must be settled
     before the test cases can be trusted. Say who probably answers it (product,
     developer, or domain expert).

     Every question also carries **your best suggested answer** — a real answer,
     not a restatement of the question — plus:
     - **Why**: why you think so. One of `industry-standard` (normal QA or
       semiconductor-test practice), `statistical` (the numerically defensible
       choice — a default sigma, a rounding rule), `technical` (how the system or
       framework actually works), or `domain` (how YieldWerx terminology or
       business context informs the suggestion). Cite the knowledge reference
       as context for `domain`, and cite the calculation basis for `statistical`.
     - **How sure**: `high` / `medium` / `low`.

     **Your suggestion is advice, not a decision.** The question stays open until a
     human confirms it, and no later stage may use your suggested value as if it
     were agreed. Suggesting an answer is there to make the human's decision fast —
     not to skip it.

4. Resolve `integrations.knowledge` using
   `${CLAUDE_PLUGIN_ROOT}/references/integrations/knowledge.md`. Use
   `yw:ask-yieldwerx` only to understand the overall YieldWerx business,
   module names, and domain terminology used by the provided requirement.

   **Authority boundary:** the provided PRD, story, ticket, addendum, or other
   approved requirement document is the sole source of truth for requirements.
   The knowledgebase is reference context, never a requirement source. It must
   not create an AC, supply a missing condition/value/result, resolve unclear
   PRD wording, or override the PRD. If the PRD is silent, add `Q-NN` and
   `TODO(spec)` even when the knowledgebase describes common product behavior.

   In **Sources and revisions**, use these exact lines:

   - `**Requirement source of truth:** <provided document and revision>`
   - `**Reference context consulted:** <knowledge revision/chapters> — Reference context only — not a requirement`

   If no knowledge reference was used, write
   `**Reference context consulted:** N/A`.

   Do not replace these fields with a table.

   Do not put a knowledgebase, handbook, domain map, or observed implementation
   in the `Source` column for `AC`, `AMB`, or `OOS`. Those source cells cite
   only the provided requirement document's section/page. Knowledge context may
   appear in Product and test data notes when clearly labeled
   `Reference context only — not a requirement`.

   Record the test data the PRD requires or implies for execution. If a
   calculation, threshold, role, transition, order, unit, or boundary is needed
   for a test but is missing from the PRD, ask a question; do not fill it from
   the knowledgebase. Current implementation remains observation only.

5. **Record the source's terms verbatim** in a `## Terms` table:
   `Term (exactly as the source writes it) · Plain meaning · Source`.

   Include every control, screen, field, status, role, mode, report, and domain word
   the analysis uses. `Plain meaning` is one short sentence for a reader with no
   domain knowledge. `Source` is the section or page where the requirement uses it.

   This table does double duty. It is the reader's glossary, and it is the
   **allowlist for acronyms**: an acronym or initialism may appear anywhere in the
   analysis only if the provided requirement itself uses it and a `## Terms` row
   cites where. Everything else is written out in full, every time. The validator
   enforces this, with a fixed exemption list for process ids, units, and file
   formats — see [plain-language.md](references/plain-language.md).

   If the source spells a label inconsistently, record both spellings as an
   `AMB-NN` and ask. Do not pick one.

6. **For each AC, say where you can see it happen** — on screen, on a chart, in an
   API response, in the database, in an imported file, in an exported report, in the
   job queue, in a rule's decision, in a saved setting, in who is allowed in, or in
   the audit log. Name another place if none of these fit.

   Then, if the AC produces a **worked-out result** (a number, a classification, a
   decision), say **how a tester will know the right answer without asking the
   application** — because if the only source of the expected value is the app
   itself, the test proves nothing. Pick whichever fits:

   | How you'll know the right answer                                                 | Use it for                       |
   | -------------------------------------------------------------------------------- | -------------------------------- |
   | Work the number out yourself, from the rule                                      | calculations, counts, thresholds |
   | A map of which statuses may follow which                                         | lifecycle / approval flows       |
   | A table of who is allowed to do what                                             | permissions and roles            |
   | Check the response against the agreed format                                     | API shapes, file formats         |
   | A separate database query that adds up                                           | totals, roll-ups, reports        |
   | A table of expected values a human signed off                                    | anything the above can't derive  |
   | 6a. **Recommend a test level per AC, and mark who owns it.** Record the level(s) |
   | in the **Best test level** column; an AC may warrant more than one (a formula is |
   | `unit` for the math _and_ `e2e` for the displayed tile).                         |

   | Level         | The behavior is                                 | Owner  |
   | ------------- | ----------------------------------------------- | ------ |
   | `component`   | one UI screen/component/chart in isolation      | **QA** |
   | `e2e`         | a full user workflow through the UI             | **QA** |
   | `security`    | authz/role enforcement observable in the UI     | **QA** |
   | `unit`        | a pure calculation or decision, no I/O          | dev    |
   | `integration` | components/services/DB/rule-engine below the UI | dev    |
   | `api`         | one HTTP contract in isolation                  | dev    |
   | `contract`    | schema conformance (zod/OpenAPI, STDF/ATDF/CSV) | dev    |
   | `performance` | throughput/latency/large-file timing            | dev    |

   This drives Case Forge's routing: **QA levels become scenarios; dev levels are
   routed to `20-cases/dev-handoff.md`** so coverage stays complete.

   **The level says how deep, not where.** A behavior reachable only through the
   desktop application is still `e2e` or `component` — the surface is carried by
   the orthogonal `@desktop` tag Case Forge adds, exactly as `@visual` and `@api`
   are carried. Note the surface in **Where to check** ("Desktop application,
   Bin Pareto report"); do not invent a level for it. Recommend the
   level where the behavior is most cheaply and reliably pinned — never inflate a
   calculation to `e2e` just because this repo runs Playwright. `@visual`/`@a11y`
   are quality dimensions, not levels; do not list them here.

7. **Group the ACs into testable chunks** `CAT-NN`. Put ACs together when a tester
   would naturally test them in one sitting, and **name the group the way a QA would
   say it out loud** — "Creating a policy", "Who is allowed to approve", "Reprocessing
   old wafers", "Report filters". Each group becomes one feature file in Case Forge.
   For each group record: name, its ACs, where you can see it happen, the domain
   ideas involved, what test data you need, how you'll know the right answer (or
   `N/A` and why), how hard it looks (`low` / `medium` / `high`), and its
   **Service surface**.

   **Service surface** names the business operations behind the group that a test
   could call directly — "Create policy, Approve policy version, List policies for
   a wafer" — or `none` with the reason, such as "the character limit is enforced
   in the browser and never reaches the server". Use the names the requirement
   uses; do not guess an endpoint, a path, or an HTTP verb, and do not invent an
   operation the requirement does not describe. If the requirement is silent on
   whether a rule is enforced server-side, write `unknown — TODO(env): confirm with
   /api-recon`.

   Case Forge designs each category at both layers and needs this to know what the
   API layer even is. Getting it wrong here is cheap; discovering it during case
   design is not.

   Every AC belongs to **exactly one** group.
8. Write `.probe/artifacts/<feature>/10-spec/spec-analysis.md` with sections:
   Summary · Sources and revisions · Terms · Testable categories · Acceptance criteria · Other things to
   consider · Where to check each requirement · Unclear wording · Open questions
   · Product and test data notes · Out of scope.
   From here on, this file is the **downstream requirement digest** — Case Forge
   and later stages read it instead of repeatedly loading the PRD. It is not a
   new authority: the provided PRD/package remains the source of truth. The
   digest must stand on its own, and any conflict requires reconciliation.
9. Run `node ${CLAUDE_PLUGIN_ROOT}/skills/probe-spec/scripts/validate-spec-analysis.mjs
.probe/artifacts/<feature>/10-spec/spec-analysis.md`. Fix every error before
   completion. Warnings require review but do not automatically block.
10. Update the ledger: Spec Probe `done` + artifact link; record the requirement
   document/revision and the knowledge reference revision separately; list category, AC,
   unclear-wording, open-question, `TODO(spec)`, `TODO(domain)`, and OOS counts. Do
   not mark the stage done when validation fails.
11. If `--compare-implementation <env-or-url>` was supplied, invoke
    `/probe-implementation <feature-slug> <env-or-url>` with the supplied role
    and build. Implementation Probe owns its own status: a blocked comparison
    does not roll Spec Probe back from `done`, and observed behavior never
    changes the approved AC inventory. Without the option, leave
    Implementation Probe `pending — optional`; use `n/a` only when a human has
    explicitly confirmed that no runtime comparison is applicable.

## Reruns and stable IDs

Resume an interrupted run from its existing artifacts. For a completed
analysis, use `--migrate-format` or `--reconcile`; an unqualified rerun fails
closed.

An item is the same item if it came from the same place in the spec and still
means the same thing — **keep its existing number.** Give new numbers only to
genuinely new items, and never renumber one that survived. If the spec dropped
or replaced a requirement, mark it `removed` or `superseded`, keep its old
number, and say what changed — otherwise every later stage's traceability
quietly shifts.

## Rules

- **When a sentence could mean two things, never just pick the easier one.** Write
  it down as an `AMB-NN` and ask.
- **Say each thing once.** The ambiguous quote lives in `AMB-NN`; the question that
  settles it points at that id instead of repeating the text. Categories point at AC
  numbers rather than restating them. If you find two records saying the same thing,
  merge them and keep the lower number.
- **Out of scope means the spec said so.** If the spec is simply silent about
  something, that is a `TODO(spec)` gap — not an out-of-scope item. Never invent an
  exclusion.
- **Your suggested answer is advice, not a decision.** The question stays open until
  a human confirms it, and no later stage may treat your suggestion as agreed truth —
  an unconfirmed suggestion is still a `TODO`. Make it genuinely your best call, not
  a hedge, but don't let having suggested something reduce the urgency of getting the
  real answer.
- **The provided requirement is the authority.** Use the knowledgebase to
  understand domain words and business context, never to create or complete a
  requirement. Any rule, threshold, formula, role, or expected result a test
  needs must be stated by the provided PRD/package or become an open question.
- **Flag every AC where a wrong number could reach a user.** That covers any AC that
  calculates, classifies, saves, exports, alerts on, or acts on real data — a
  displayed statistic, a re-bin or hold decision, which policy version got applied, an
  emitted alert. For those, name the independent sources that must agree, and treat
  any disagreement between them as a `blocker`. Which sources those are depends on the
  feature — don't assume it is always chart, oracle and database.
- **Recommend the test level that fits, not the one this repo can run.** Say where a
  behavior is best checked even when that is a developer's unit or API test — that is
  exactly how work QA does not own stays visible instead of being quietly dropped.
  Don't push everything to `e2e` because this repo runs Playwright, and remember the
  level is a recommendation: Case Forge decides the final tag.
- **Keep the file short — a summary, not a copy of the PRD.** Use tables for
  the indexes and short AC definitions. It still has to stand alone.
- **Say where every item came from.** Every AC, ambiguity, and out-of-scope
  item cites the provided requirement's section/page. Never cite knowledgebase
  context as requirement authority. `derived` is only allowed on a `DER-NN`;
  never use it to conjure an AC out of nothing. Before marking a question
  confirmed, name the approved requirement addendum/decision and its date.

## Write it in plain language

**A QA and a product owner are the readers, and increasingly someone new to
semiconductor test.** They must be able to read an AC, a category name, or an open
question and know what it means without a glossary, a second document, or a
developer sitting next to them. If a QA cannot tell what to test from your
sentence, the sentence has failed — however precise it is.

Full authority, with the exemption lists and worked examples:
[references/plain-language.md](references/plain-language.md). The validator enforces
all of it. The five rules that matter most:

- **Labels are verbatim.** Every control, screen, field, tab, button, status,
  message, and product term is written **exactly as the source writes it** — same
  words, same capitalisation, same spacing, same singular or plural. The source's
  `Cluster Detection Mode` is never `cluster mode`, never `Cluster Det. Mode`, and
  never `CDM`. Quote it in a Gherkin step:
  `When The user clicks the "Save Profile" button`. A first use may add a short
  gloss in parentheses — _inking (re-binning the good dies around a cluster to a
  fail bin)_ — but the label itself is untouched. An inconsistent label in the
  source is an `AMB-NN`, not a licence to choose.
- **Never invent an acronym or initialism.** One may appear only if the provided
  requirement itself uses it **and** a `## Terms` row cites where. Everything else
  is written out in full, every time. Process ids, units, and file formats are
  exempt; the authority lists them exactly.
- **Never abbreviate.** Write `configuration`, not `config`; `message`, not `msg`;
  `quantity`, not `qty`; `average`, not `avg`; `parameter`, not `param`. The
  authority carries the full rejected list.
- **Say it the way you would say it aloud.** "The policy name must be unique" beats
  "policy identity uniqueness is enforced at persistence". Prefer the visible word
  over the internal one — write the label the user sees, not the field, table,
  enum, or DTO name. Internal names belong in `case-details.md` later.
- **Use a domain term when it is the real word for the thing, then explain it once
  in `In plain words`.** Hard bin, soft bin, wafer notch, cluster, inking, probing
  sequence, yield — a QA testing YieldWerx must know these, so use them, and let
  the plain-words line carry the explanation for everyone else.

Also:

- **Drop jargon that adds nothing.** Say "where to check" not "verification
  surface"; "how to know the correct result" not "truth strategy"; "unclear
  wording" not "semantic ambiguity"; "test data needed" not "evidence strategy".
  Say `saved`, not `persisted`; `error message`, not `validation response`. Do not
  write `payload`, `DOM`, `locator`, `method`, `class`, `schema`, `leverage`, or
  `operationalize` unless the approved requirement itself is about that technical
  item.
- **One AC, one result that can pass or fail.** If two parts can fail separately,
  give them separate AC IDs.
- **Numbers stay exact.** Plain language applies to the prose, never to a value: a
  threshold, bin number, tolerance, or rounding rule is written precisely or not at
  all. Vagueness in an expected value is the one thing worse than jargon.
- **Avoid vague words.** Do not use `fast`, `easy`, `properly`, `correctly`,
  `seamless`, `intuitive`, or `user-friendly`. Replace them with something a QA can
  check. If the source uses one and never makes it measurable, that is an `AMB-NN`
  or a `Q-NN`.
- **Start every AC with a short result summary**, using the exact label and opening
  words `**Summary:** Verify that ...` — one sentence, twenty words or fewer.
- **Follow it with `**In plain words:**`** — one to three sentences for a reader
  with no domain knowledge. Required on every active AC.
- **Write both AC formats in Gherkin.** One `Given`, one `When`, and one or more
  `Then`/`And` results. Do not write the click-by-click test procedure here.
- **Keep Simple Rules direct.** Every `Then`/`And` result uses `must` or
  `must not`. A performance rule states the workload, test environment, exact
  limit, and how many measured runs must meet it.
- Keep the short ids (`AC-01`, `CAT-03`, `Q-07`) — they are how stages refer to each
  other, and QAs get used to them in a day.

**The section and column names are fixed** — a validator and the coverage tool check
them, so don't rename them. Instead, put a one-line plain-language subtitle under each
heading so a first-time reader knows what they are looking at:

| Heading (keep as-is)            | Subtitle to add                                                 |
| ------------------------------- | --------------------------------------------------------------- |
| Sources and revisions           | "The provided requirement authority and reference context."     |
| Terms                           | "The product's own words for the things in this feature."       |
| Testable categories             | "The groups of testing for this feature."                       |
| Acceptance criteria             | "What the product must do, per the spec."                       |
| Other things to consider        | "Useful ideas that the spec does not yet require."              |
| Where to check each requirement | "Where a QA can check each result and know the correct answer." |
| Unclear wording                 | "Words in the spec that could mean more than one thing."        |
| Open questions                  | "What the team must answer before these cases can be trusted."  |
| Product and test data notes     | "The product facts and test data these tests need."             |
| Out of scope                    | "What the spec says is deliberately not included."             |

Quick check before you finish: read three summaries aloud — if any needs a second
sentence to explain the first, rewrite it. Read one `In plain words` line as if you
joined yesterday — if it only restates the summary, rewrite it. Then search your
draft for any run of two or more capital letters: every hit is either exempt, or in
`## Terms` citing the source, or a bug.

## Formats in `spec-analysis.md`

Use these fixed columns:

| Section                  | Columns                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Terms                    | `Term (exactly as the source writes it) · Plain meaning · Source`                                                    |
| Testable categories      | `CAT · Name · ACs · Where to check · Product terms · Test data needed · How to know the correct result · Difficulty · Service surface` |
| Acceptance criteria      | `AC · Format · Requirement · Source · Where to check · Best test level · Status(active/superseded/removed)`          |
| Other things to consider | `DER · Suggestion · Why · Needs answer(Q-NN / TODO)`                                                                 |
| Unclear wording          | `AMB · Exact words · Source · Possible meanings`                                                                     |
| Open questions           | `Q · Question · Who can answer · Suggested answer · Why · How sure · Status`                                         |
| Out of scope             | `OOS · Item (spec's words) · Source · Type(excluded/deferred)`                                                       |

Under the Acceptance criteria index, add exactly one definition for each active
AC.

### Workflow AC example

````markdown
### AC-01 — Save a valid profile picture

**Summary:** Verify that a user can save a valid profile picture.
**In plain words:** Every user has a picture shown next to their name. This lets
them replace it with a photo from their own computer, as long as the file is one of
the two allowed image types and is not too large.
**Format:** Workflow

```gherkin
Given The user is on the "Edit Profile" screen
And The user has selected a .png or .jpeg picture no larger than 5 MB
When The user clicks the "Save Profile" button
Then The selected picture is saved
And The picture is displayed on the user's profile
```
````

### Simple Rule AC example

````markdown
### AC-02 — Profile picture file types

**Summary:** Verify that only .png and .jpeg profile pictures are accepted.
**In plain words:** Image files come in many formats, and the product supports only
two of them. Anything else — a document, a video, or an image in another format —
is turned away rather than saved.
**Format:** Simple Rule

```gherkin
Given The user is on the "Edit Profile" screen
When The user selects a profile picture
Then The picture must be in `.png` or `.jpeg` format
And Every other file type must be rejected
```
````

### Terms example

```markdown
| Term (exactly as the source writes it) | Plain meaning                                             | Source  |
| -------------------------------------- | --------------------------------------------------------- | ------- |
| Edit Profile                           | The screen where a user changes their own details.        | §3.1    |
| Save Profile                           | The button that stores the changes made on that screen.   | §3.1    |
| hard bin                               | The pass/fail category a chip is put in by the tester.    | §2, p.4 |
```

Write the term exactly as the source writes it. A row is what makes an acronym the
source uses legal elsewhere in the analysis; without a row, write the words out.

Do not write "changes are saved automatically when the user clicks Save."
`Automatically` and `clicks Save` describe different behavior. Record unclear
wording as `AMB-NN` and ask which behavior is required.

- Every active AC carries exactly one `**Summary:**` line and exactly one
  `**In plain words:**` line, in that order, before `**Format:**`.
- **Best test level** carries Task 6a's suggested level(s), comma-separated. It guides —
  it does not bind — Case Forge's per-scenario `@testtype:` tag.
- **Why** for an open question uses `industry-standard`, `statistical`,
  `technical`, or `domain`. A domain reference explains the suggestion but
  never turns it into an approved requirement.
- Every AC appears in **exactly one** category. Difficulty feeds automation pacing.
- Out of scope holds only what the spec **explicitly** excludes — no overlap with
  any AC/AMB/Q. If it declares nothing, write "None declared in source."
- Add a prose paragraph only where a table genuinely cannot carry the meaning
  (a contested reading, a multi-step derivation).
