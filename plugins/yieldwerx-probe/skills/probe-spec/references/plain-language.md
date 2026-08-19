# Plain language in `spec-analysis.md`

The authority for how Spec Probe writes. Read it before writing an acceptance
criterion, a category name, or an open question. `validate-spec-analysis.mjs`
enforces the rules on this page; this file explains them and lists the exact
exemptions.

## Why this page exists

The analysis is read by a QA engineer and a product owner, and increasingly by
someone new to semiconductor test who has to understand what a criterion means
without a glossary or a developer beside them.

Three habits break that, and all three are things a language model does by
default:

1. **Shortening a name.** The product says `Cluster Detection Mode`; the analysis
   says `cluster mode`, or `CDM`. The tester then cannot find the control, and
   nobody can tell whether the difference is a typo or a different thing.
2. **Coining an acronym.** The source never wrote `SPC limit set` as `SLS`, but
   the analysis does — and now the document has private vocabulary that exists
   nowhere in the product, the PRD, or the team's speech.
3. **Restating a simple rule in technical language.** "The policy name must be
   unique" becomes "policy identity uniqueness is enforced at the persistence
   layer". Nothing was gained and a reader was lost.

The rules below exist to stop those three, and nothing else. They apply to prose.
**They never apply to a value** — a threshold, bin number, tolerance, or rounding
rule is written exactly or not at all.

## Rule 1 — Labels are verbatim

Every control, screen, field, tab, button, menu item, status, message, and product
term is written **exactly as the provided requirement writes it**: same words, same
capitalisation, same spacing, same singular or plural.

| Source says              | Write                    | Never                                     |
| ------------------------ | ------------------------ | ----------------------------------------- |
| `Cluster Detection Mode` | `Cluster Detection Mode` | `cluster mode`, `CDM`, `Cluster Det. Mode` |
| `Save Profile`           | `Save Profile`           | `Save`, `the save button`                  |
| `Hold for Review`        | `Hold for Review`        | `hold status`, `HFR`, `held`               |
| `Scope level`            | `Scope level`            | `Scope Level`, `scope`                     |

Quote a label in Gherkin steps: `When The user clicks the "Save Profile" button`.

A first use may add a short gloss in parentheses — `inking (re-binning the good
dies around a cluster to a fail bin)` — but the label itself is untouched.

If the source is inconsistent about a label, that is an `AMB-NN`, not a licence to
pick one. Quote both spellings and ask.

## Rule 2 — No invented acronyms or initialisms

An acronym may appear **only if the provided requirement itself uses it**, and it
must then have a row in the `## Terms` table citing where the source defines or
first uses it. Everything else is written out.

This is why `## Terms` is required: it is simultaneously the reader's glossary and
the validator's allowlist. A term earns its short form by being in the source, not
by being long.

### Always exempt (never flagged)

- **Process ids:** `AC-01`, `AMB-02`, `OOS-03`, `Q-04`, `CAT-05`, `DER-06`,
  `TC-<slug>-007`, and external case keys such as `YWPD-TC-1202`.
- **Units:** `MB`, `KB`, `GB`, `ms`, `s`, `min`, `h`, `mm`, `µm`, `nm`, `°C`, `%`,
  `px`, `dpi`, `Hz`, `RPM`.
- **File and data formats:** `CSV`, `TSV`, `JSON`, `XML`, `YAML`, `PDF`, `PNG`,
  `JPEG`, `SVG`, `ZIP`, `STDF`, `ATDF`, `WAT`, `GDSII`.
- **Universal technical names** where the requirement is genuinely about them:
  `API`, `URL`, `HTTP`, `HTTPS`, `UI`, `ID`, `SQL`, `UTC`, `SLA`.
- **Statistical and test-engineering terms** that are the real word for the thing:
  `Cpk`, `Cp`, `SPC`, `PAT`, `Gage R&R`, `σ`.
- **Markdown structure:** table headers and section names fixed by the format.

### Never exempt

A capability, mode, screen, role, rule, policy, report, or setting named in the
source. `Cluster Detection Mode` does not become `CDM` even once, even after a
`## Terms` row, unless the source itself writes `CDM`.

## Rule 3 — No abbreviations

Write the whole word. These are rejected in a Summary, an `In plain words` line,
and inside Gherkin steps:

`config`, `configs`, `auth`, `val`, `vals`, `msg`, `msgs`, `qty`, `avg`, `num`,
`nums`, `calc`, `calcs`, `env`, `envs`, `param`, `params`, `prop`, `props`,
`attr`, `attrs`, `spec`, `specs`, `doc`, `docs`, `dir`, `dirs`, `repo`, `repos`,
`temp`, `init`, `dup`, `dups`, `seq`, `hrs`, `mins`, `secs`, `pct`, `admin`,
`admins`, `info`.

Some of these are real words in some products — `admin`, `info`, `spec`, `temp`.
They are cleared the same way an acronym is: **add a `## Terms` row**, and the
short form is allowed wherever the source uses it.

`ID` stays — it is universal and exempt above. Write `maximum` and `minimum` in
prose rather than `max`/`min`; the checker does not enforce that one, because the
short forms are legitimate inside a field name the source itself writes.

## Rule 4 — The Summary is one plain sentence

`**Summary:** Verify that ...` — one sentence, twenty words or fewer, naming the
visible thing a QA will check. No acronym, no abbreviation, no jargon.

| Good                                                                | Bad                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Verify that a user can save a profile picture in .png or .jpeg      | Verify that the profile image persistence layer validates MIME types |
| Verify that the policy name must be unique                          | Verify that policy identity uniqueness is enforced on persist        |
| Verify that a wafer with no failing dies shows a yield of 100.00%   | Verify that the yield calculation handles the null-fail edge case    |

## Rule 5 — Every criterion gets an `In plain words` explanation

Immediately after the Summary, before `**Format:**`:

```markdown
**In plain words:** One to three sentences for a reader with no domain
knowledge. Say what the thing is, why it matters, and what a tester would see.
```

Write it for a competent person who has never worked on semiconductor test. Name
the domain terms and explain them here — this is the one place where explaining
`hard bin` or `notch` in a full sentence belongs.

**Good:**

> **In plain words:** A wafer is a disc of chips, and each chip gets a pass or fail
> result during testing. When several failing chips sit next to each other, that
> cluster usually means a physical defect rather than bad luck, so the product
> marks the good chips around it as failed too — that is "inking". This criterion
> says the marking only happens when the cluster has at least three failing chips.

**Bad** (restates the Summary, explains nothing):

> **In plain words:** The system inks clusters when the minimum cluster size
> threshold is met.

## Rule 6 — Drop jargon that adds nothing

Say the plain thing:

| Don't write            | Write                          |
| ---------------------- | ------------------------------ |
| verification surface   | where to check                 |
| truth strategy         | how to know the correct result |
| semantic ambiguity     | unclear wording                |
| evidence strategy      | test data needed               |
| persisted              | saved                          |
| validation response    | error message                  |
| payload                | the data sent / the response   |
| leverage, utilize      | use                            |
| operationalize         | do / run                       |
| instantiate, hydrate   | create / fill in               |

`payload`, `schema`, `endpoint`, `DOM`, `locator`, `method`, and `class` are
allowed only when the approved requirement is itself about that technical item —
an API contract criterion may legitimately need `endpoint` and `schema`.

## Rule 7 — Vague words are rejected outright

`fast`, `easy`, `properly`, `correctly`, `seamless`, `intuitive`, `user-friendly`.
Replace each with something a QA can measure or see. If the source uses one and
gives no measurable meaning, that is an `AMB-NN` or a `Q-NN` — not something to
carry forward.

## The three-read check before you finish

1. Read three Summaries aloud. If any needs a second sentence to make sense, it
   has failed.
2. Read one `In plain words` line to yourself as if you had joined the company
   yesterday. If it only restates the Summary, rewrite it.
3. Search your own draft for a capital-letter run of two or more. Every hit is
   either in the exempt list, or in `## Terms` citing the source, or it is a bug.
