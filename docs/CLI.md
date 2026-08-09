# PROBE CLI

The dependency-free CLI lets consumers use PROBE validators and adapters
without copying their source files.

## Requirements

- Node.js 22.18 or newer.
- A `probe.config.yaml` file in the consumer repository.
- Claude Code only for the installed-plugin part of `probe doctor`.

## Commands

```text
probe doctor
probe validate-config
probe validate-spec <spec-analysis.md>
probe lint-gherkin <feature-slug> [selectors]
probe coverage <feature-slug>
probe owner-bypass authorize|verify|consume [arguments]
probe aio help
probe aio check
probe aio whoami
probe aio folders
probe aio cases
probe aio sync <feature-slug>
```

`probe doctor` checks the configuration version, consumer paths, project-level
plugin enablement, and installed plugin versions. Use
`--skip-plugin-check` where the Claude CLI is not installed.

All AIO writes remain dry-run by default. `probe aio sync --live` retains the
same signed-gate and explicit-live protections as the bundled adapter. AIO
credentials come from process environment variables or the consumer's
gitignored `.env`; the CLI never prints their values.

`probe owner-bypass authorize` is reserved for PROBE Owner Tafseer Haider
(`tafseer.haider@yieldwerx.com`). It reads a private 6–12 digit
`PROBE_OWNER_BYPASS_PIN` and a generated high-entropy signing key from the user
environment or gitignored `.env`, asks for the matching PIN through hidden
terminal input, and writes a short-lived signed receipt under
`.probe/authorizations/`. Run `probe owner-bypass setup` once to configure
both secrets without printing them. Never put the PIN in a command argument or
chat. Use `verify` before applying the waiver and `consume` after the ledger
records it.

## Consumer package

The repository package is `@yieldwerx/probe-cli`. It can be published to an
approved private Azure Artifacts feed or installed from a reviewed Git tag.

Example consumer scripts:

```json
{
  "scripts": {
    "probe:doctor": "probe doctor",
    "probe:lint-gherkin": "probe lint-gherkin",
    "coverage:req": "probe coverage",
    "aio:check": "probe aio check",
    "sync:cases": "probe aio sync"
  }
}
```
