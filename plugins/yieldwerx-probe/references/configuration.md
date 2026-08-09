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

| Purpose | Default |
| --- | --- |
| Features | `features/` |
| Ledgers and signed reports | `docs/qa/` |
| Working evidence | `.probe/artifacts/` |
| Test data | `test-data/` |
| Profile | `generic` |

Before running a framework-specific command, look it up under `commands`. If it
is absent, report the capability as unavailable or use the workflow's
documented manual fallback; never guess an npm, CI, case-management or browser
command.

## Profile references

Plugin reference files do not load automatically. When `profile:
playwright-bdd` is selected, explicitly read only the applicable files under
`${CLAUDE_PLUGIN_ROOT}/references/profiles/playwright-bdd/`:

- code, tags, or traceability: `rules/coding-conventions.md`;
- UI selectors or page/component objects: `rules/locator-policy.md`;
- charts or calculated visual data: `rules/chart-testing.md`;
- visual, bug, or UI-impact work: the matching file under `docs/`.

Consumer-owned `.claude/rules/` remain applicable project rules. Apply both
sets when they agree. If they conflict, stop and report the exact conflict
instead of silently choosing one.

## Knowledge

Knowledge is an integration. Follow
[the knowledge-provider contract](integrations/knowledge.md), use the configured
provider, and record its revision. Missing domain truth is an open question,
not permission to reuse a stale product implementation.
