# YieldWerx PROBE repository instructions

This repository is the source of truth for the portable PROBE process and its
Claude plugin. It does not own any consumer framework's feature files,
automation scripts, test data, ledgers, evidence, credentials, or product
knowledge.

## Change contract

- Treat `plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md` as process
  authority. Update affected skills and agents in the same pull request. The
  development track's authority is
  `plugins/yieldwerx-probe/references/process/DEV-TRACK.md`; where the two
  appear to conflict, PROBE-PROCESS wins and the conflict is reported.
- Development-track skills and agents carry `track: dev`, a `safety:` level, and
  a `graph:` block whose edges repository validation resolves. A dev skill must
  never write to `docs/qa/`, amend a feature file or case artifact, or sign,
  assemble, or substitute for a gate.
- Keep core instructions independent of Playwright, Cucumber, TypeScript,
  Jenkins, AIO, Plotly, or any consumer directory layout. Put stack-specific
  material in a named profile or adapter and require explicit configuration.
- Resolve consumer paths, commands, and integrations from `probe.config.yaml`.
  Never embed a developer workstation path or secret.
- Keep YieldWerx product/domain facts in `yieldwerx-knowledgebase`; PROBE may
  consume the configured `ask-yieldwerx` skill and cite its pinned source IDs
  but must not duplicate it.
- Plugin profile references do not load automatically. Skills and agents must
  explicitly read the applicable active-profile files.
- Preserve stable workflow, acceptance-criteria, category, and test-case IDs.
- Agents and skills may assemble gate evidence but never fill a human
  signature.
- External writes remain preview/dry-run by default and require explicit human
  authorization.

## Repository checks

Run `npm test` for every change. When Claude Code is installed, also run
`claude plugin validate .`. Release changes update the plugin version and
`CHANGELOG.md`.
