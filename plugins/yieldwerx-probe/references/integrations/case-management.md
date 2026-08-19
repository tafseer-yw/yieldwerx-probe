# Case-management adapter contract

How `/sync-cases` reaches an external case-management system, and what a consumer
must supply to plug in a different one.

## The problem this contract solves

Case Sync used to be defined as *a shell command*: run the configured `syncCases`,
pass `--live` when a human approves. That definition worked in Claude Code, which
has a Bash tool, and failed completely in Claude Desktop, which gives the
assistant no shell. The skill was not wrong; its engine was simply unreachable.

So the skill is defined against **verbs**, and an engine is anything that can
perform them. Three ship with PROBE; a consumer can supply a fourth.

## The six verbs

| Verb          | Does                                                              | Writes remotely | Needs credentials |
| ------------- | ----------------------------------------------------------------- | --------------- | ----------------- |
| `check`       | Confirm the token authenticates against the configured project    | no              | yes               |
| `explore`     | List folders, and the cases already in one, for a duplicate check | no              | yes               |
| `plan`        | Parse feature files and produce the exact create/update plan      | no              | **no**            |
| `authorize`   | Confirm a recorded human approval covers the plan's scope         | no              | no                |
| `push`        | Create and update the records                                     | **yes**         | yes               |
| `write back`  | Add each returned key as a second scenario tag                    | no (local)      | no                |

Two properties hold for every engine:

- **`plan` needs no credentials and writes nothing.** It must be runnable by
  anyone, anywhere, including with no network. It is what a human reviews.
- **`push` is refused without both** an explicit live instruction and a recorded
  human Design Gate approval for the exact scope
  ([human-gates.md](../governance/human-gates.md)). An engine that can be talked
  into one push without the other is not conformant.

## The three bundled engines

### 1. CLI — a shell is available

The default. `probe aio …`, or the consumer's configured `commands.syncCases`.
Everything runs as a child process; the Bash blast-radius guard sees the `--live`
flag and asks before the write.

### 2. MCP — the host runs processes, the assistant has no shell

`adapters/mcp/server.mjs`, a dependency-free stdio MCP server the host launches
itself. The plugin declares it, so installing the plugin is the whole setup:

```json
"mcpServers": {
  "probe-tools": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/adapters/mcp/server.mjs"],
    "env": { "CLAUDE_PROJECT_DIR": "${CLAUDE_PROJECT_DIR}" }
  }
}
```

Tools: `aio_check`, `aio_whoami`, `aio_folders`, `aio_cases`, `aio_plan`,
`aio_sync`, plus `probe_validate_spec`, `probe_lint_cases`, and `probe_coverage`
for the other capabilities the same no-shell constraint breaks.

It spawns the same bundled scripts the CLI does — one engine, two front ends — and
reads credentials from the environment and the consumer's gitignored `.env`,
never from the manifest.

**`aio_sync` carries its own confirmation.** The Bash guard is a PreToolUse hook
on the Bash tool; on this path there is no Bash call, so the guard never fires.
The tool therefore refuses without `confirm: true`, *and* the adapter beneath it
still refuses without a recorded approval. Neither substitutes for the other.

### 3. Export bundle — neither is available

The honest fallback. Write the plan plus an importable bundle and a written-out
list of the exact tag edits a later run will apply, then stop.

- `25-aio-sync/aio-sync.md` — the normal plan.
- `25-aio-sync/aio-import.csv` — the create/update set in the provider's import
  format, for a human to upload.
- `25-aio-sync/aio-writeback.md` — every scenario and the key tag it needs once
  the import returns one.

Record Case Sync as `blocked — no sync engine available` with the bundle linked.
**Never record it as done, and never claim a sync happened.** The bundle is
preparation; the sync has not occurred.

## Choosing an engine

`/sync-cases` probes the host once, at step zero, and says which engine it
selected and why:

1. A shell is available and `commands.syncCases` (or the bundled CLI) resolves →
   **CLI**.
2. The `aio_*` MCP tools are present → **MCP**.
3. Neither → **export bundle**.

Never silently degrade. If the CLI engine was expected and is missing, say so
before falling back — a quiet fallback to the export bundle looks like a sync that
worked.

## Supplying a different engine

Implement the six verbs, keeping the two properties above, and point
`commands.syncCases` at it or expose it as MCP tools with the same names. The
skill does not care which system is behind it. What it requires is that `plan` is
free and safe, `push` is doubly gated, and `write back` touches only the key tag —
never a title, never a step body, never a local TC id.
