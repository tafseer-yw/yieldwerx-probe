# Stack profiles — the contract

A profile is the fact sheet for one technology stack: what the layers are, what
the conventions are, where classes of bugs live, and which consumer-configured
commands the skills need. Skills read facts from the active profile instead of
from memory, which is the entire mechanism behind `--stack` routing: **one set of
skills, any number of stacks, and adding a stack is a profile, never a new
skill.**

## The profiles this plugin ships

| Profile | Stack | Status |
| --- | --- | --- |
| `node-ts-spa` | Node/TypeScript HTTP service + SPA frontend (the probe-lab shape) | current |
| `dotnet-legacy` | ASP.NET MVC 5 on .NET Framework, EF6, SQL Server, WinForms desktop (the shipped yieldWerx platform) | current |
| `dotnet-modern` | .NET REST-on-a-gateway direction for new services | **provisional** — no repository stands behind it yet; it carries direction, not invented specifics |
| `playwright-bdd` | The QA automation framework (Playwright + playwright-bdd + Allure) | current |
| `testcomplete-winforms` | TestComplete desktop automation against the WinForms client | current |

A consumer may also supply its own profile directory; the resolution rules in
[configuration.md](../configuration.md) treat bundled and consumer-owned
profiles identically.

## How a stack is selected

Dev-track skills accept `--stack <profile-name>`. Resolution order, and it fails
closed at every step:

1. **The explicit `--stack` argument.** If `probe.config.yaml` declares a
   `stacks:` list and the name is not in it, refuse — the consumer has said
   which stacks exist here, and an unlisted one is a typo or a wrong repo.
2. **No argument:** the first entry of the config's `stacks:` list.
3. **No `stacks:` list:** the config's `profile:` key, when it names a dev-track
   profile (backward compatibility with pre-3.1 configs).
4. **None of the above:** stop and ask. Never guess a stack — designing against
   the wrong one produces confidently wrong layer maps.

QA-track skills keep using `profile:` exactly as before; `--stack` is a
dev-track routing argument, plus the QA skills that target application code
directly (API test forge, desktop scripting).

## What every profile MUST contain

A profile a skill cannot trust is worse than no profile, because the skill
believes it. Each profile's `README.md` carries these sections, in this order,
and a profile missing one is invalid:

1. **Scope line** — one sentence: what stack, and when to load this profile.
2. **Commands** — a table of the `probe.config.yaml` keys this profile expects
   (`commands.build`, `commands.unitTests`, …). Profiles never hardcode a
   command: every command is resolved from consumer configuration, and an
   absent key is reported unavailable, not guessed. The table is the list of
   what to look up.
3. **Layer architecture** — the request/data flow through the stack's real
   layers, specific enough that a design can be mapped onto it
   (`Controller → BL Service → DL Service → Repository`, not "MVC").
4. **Conventions** — naming, placement, and idiom rules a change must follow to
   look native.
5. **Test conventions** — the real frameworks and where tests live.
6. **Search anchors** — how to *find* things: where to grep for an endpoint, a
   message, a table's consumers. These make every skill's exploration cheap.
7. **Traps** — the mistakes this stack invites, each stated as
   symptom → mechanism. This section is why profiles exist; it is the
   accumulated cost of past debugging, written down once.

Optional, when the stack has them: `rules/` files that other skills resolve
obligations from (selector policy, service conventions, migration rules), and
`docs/` for longer references.

## Keeping profiles honest

- A profile records **verified facts about a real repository**, with the
  repository named. The one exception is a profile explicitly marked
  **provisional**, which may carry architectural direction but no invented
  commands, paths, or conventions — and every skill that loads it must say it
  is building against a provisional profile.
- When a skill discovers the profile is wrong — a command that no longer
  exists, a layer that moved — fixing the profile is part of the work, exactly
  as a stale ledger is (PROBE-PROCESS §4).
- Profiles do not load automatically. A skill reads the active profile's
  README, then only the `rules/`/`docs/` files applicable to its work.
