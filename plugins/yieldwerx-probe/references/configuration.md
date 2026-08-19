# Consumer configuration

PROBE runs from a plugin cache while reading and writing the current consumer
repository. Resolve configuration in this order:

1. PROBE defaults;
2. `<consumer-root>/probe.config.yaml`;
3. explicit workflow arguments.

The consumer owns requirements, features, ledgers, artifacts, test data,
automation code and integration credentials. PROBE owns workflow instructions,
templates, schemas and plugin-bundled references.

When `probe.config.yaml` is absent, use these compatibility defaults:

| Purpose                    | Default             |
| -------------------------- | ------------------- |
| Features                   | `features/`         |
| Ledgers and signed reports | `docs/qa/`          |
| Working evidence           | `.probe/artifacts/` |
| Test data                  | `test-data/`        |
| Profile                    | `generic`           |

Before running a framework-specific command, look it up under `commands`. If it
is absent, report the capability as unavailable or use the workflow's
documented manual fallback; never guess an npm, CI, case-management or browser
command.

## Hosts without a shell

Some hosts run processes but give the assistant no shell — Claude Desktop is the
one this matters for. Every PROBE capability with an executable behind it is
reached through a configured command, so on such a host `syncCases`,
`lintCases`, `requirementsCoverage`, and the spec validator are all unreachable
by the same mechanism.

**Check what this host can do before reporting a capability as failed.** In order:

1. **A shell** — run the configured command. The normal path.
2. **The bundled MCP tools** — the plugin ships a stdio MCP server
   (`adapters/mcp/server.mjs`) and declares it in its manifest, so where the host
   supports plugin MCP servers the tools are already present:
   `probe_validate_spec`, `probe_lint_cases`, `probe_coverage`, and the `aio_*`
   sync verbs. Use them exactly as you would the command.
3. **Neither** — perform the check inline against the same rules, and record what
   you did:

   ```
   validated: inline (no shell host) — <what was checked, what could not be>
   ```

   An inline check is a real check and is worth doing; presenting it as the
   script's output is not. Name it for what it is, so a gate digest can report the
   difference.

For Case Sync specifically there is a third engine — an importable export bundle —
because a sync that did not happen must never look like one that did. Authority:
[case-management.md](integrations/case-management.md).

**Never silently degrade.** Say which route you took. A capability that quietly
fell back reads as a capability that worked.

## Application stacks (`--stack`)

Dev-track skills — and the QA skills that target application code directly —
route on a stack profile. Resolution order, failing closed at every step:

1. the explicit `--stack <profile-name>` argument. When the config declares a
   `stacks:` list and the name is not in it, refuse: the consumer has said
   which stacks exist here;
2. no argument → the **first** entry of `stacks:`;
3. no `stacks:` list → the `profile:` key, when it names a dev-capable profile
   (pre-3.1 compatibility);
4. otherwise stop and ask. Never guess a stack.

The profile contract — what every profile must contain, and the shipped set —
is [profiles/README.md](profiles/README.md). A skill records which stack it
resolved and how (argument, config default, or compatibility fallback) in its
artifact, and says explicitly when the resolved profile is marked provisional.

## Profile references

Plugin reference files do not load automatically. When `profile:
playwright-bdd` is selected, explicitly read only the applicable files under
`${CLAUDE_PLUGIN_ROOT}/references/profiles/playwright-bdd/`:

- code, tags, or traceability: `rules/coding-conventions.md`;
- UI selectors or page/component objects: `rules/locator-policy.md`;
- charts or calculated visual data: `rules/chart-testing.md`;
- visual, bug, or UI-impact work: the matching file under `docs/`.

When `profile: node-ts-spa` is selected, first read
`${CLAUDE_PLUGIN_ROOT}/references/profiles/node-ts-spa/README.md`, then load the
rules applicable to the work:

- frontend controls, selectors, or testability gaps:
  `rules/selector-policy.md`;
- routes, authorization, validation, persistence, asynchronous work, API
  documentation, or deterministic results: `rules/service-conventions.md`.

Development-track skills and agents must load both rule files when a change
crosses the frontend/service boundary. If a named profile has no bundled or
consumer-owned reference, report the profile as unavailable instead of
silently applying another profile.

Consumer-owned `.claude/rules/` remain applicable project rules. Apply both
sets when they agree. If they conflict, stop and report the exact conflict
instead of silently choosing one.

## Knowledge

Knowledge is an integration. Follow
[the knowledge-provider contract](integrations/knowledge.md), use the configured
provider, and record its revision. Missing domain truth is an open question,
not permission to reuse a stale product implementation.
