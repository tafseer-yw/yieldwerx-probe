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
probe aio help
probe aio check
probe aio whoami
probe aio folders
probe aio cases
probe aio sync <feature-slug>
probe mcp-server
```

`probe doctor` checks the configuration version, consumer paths, project-level
plugin enablement, and installed plugin versions. Use
`--skip-plugin-check` where the Claude CLI is not installed.

All AIO writes remain dry-run by default. `probe aio sync --live` requires a
recorded human Design Gate approval for its scope and the explicit `--live`
flag, exactly as the bundled adapter does. AIO credentials come from process
environment variables or the consumer's gitignored `.env`; the CLI never prints
their values.

`probe mcp-server` starts the stdio MCP adapter — the engine for hosts that run
processes but give the assistant no shell. Hosts normally launch it from the
plugin manifest; this entry point exists for a manual MCP configuration and for
debugging. It exposes the AIO sync verbs plus `probe_validate_spec`,
`probe_lint_cases`, and `probe_coverage`, and refuses a live sync without an
explicit `confirm`.

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
