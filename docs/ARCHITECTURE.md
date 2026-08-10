# Repository architecture

PROBE is split so a consumer can adopt the process without copying its
automation framework.

| Layer | Location | Responsibility |
| --- | --- | --- |
| Marketplace | `.claude-plugin/marketplace.json` | Company plugin discovery |
| Plugin manifest | `plugins/yieldwerx-probe/.claude-plugin/plugin.json` | Plugin identity and release version |
| Core workflows | `plugins/yieldwerx-probe/skills/` | Review-gated PROBE stages |
| Specialist agents | `plugins/yieldwerx-probe/agents/` | Delegated bounded roles |
| Process authority | `plugins/yieldwerx-probe/references/process/` | Governance, sequence, gates, policies |
| Profiles | `plugins/yieldwerx-probe/references/profiles/` | Framework-specific compatibility guidance |
| Adapters | `plugins/yieldwerx-probe/adapters/` | Optional external-system implementations |
| Portable CLI | `bin/` | npm-distributed consumer doctor, validators, reports and adapter entry points; kept outside the hosted plugin payload |
| Consumer contract | `config/`, `examples/` | Portable paths, commands, integrations, policies |
| Repository validation | `scripts/`, `tests/` | Deterministic release checks |

The plugin executes in the current consumer repository. `${CLAUDE_PLUGIN_ROOT}`
points to plugin-owned files; `probe.config.yaml` resolves consumer-owned
locations and commands.

Product knowledge is a separate dependency:
`yieldwerx-knowledgebase` supplies versioned domain truth, while PROBE supplies
the workflow that consumes it. A missing knowledge source becomes an explicit
question or `TODO(domain)`, never an inferred requirement.

The preferred connection is the separately installed
`yw:ask-yieldwerx` skill, backed by the knowledgebase dependency declared in
`probe.config.yaml`. PROBE records the configured knowledge version and the
source IDs used in each analysis.
