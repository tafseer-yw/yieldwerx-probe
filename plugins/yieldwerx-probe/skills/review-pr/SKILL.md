---
name: review-pr
user-invocable: true
description: Use when a pull request must be reviewed as its reviewer, not its author — the diff against its linked requirement, the description against the actual change, the test evidence against the claims, and the downstream artifacts the change invalidates. Host-aware: gh for GitHub repositories, az repos for Azure DevOps. Reads and reports by default; posting review comments to the host requires explicit authorization. PROBE development track.
track: dev
safety: writes-local
produces: .probe/artifacts/reviews/pr-<id>/pr-review.md with a GO / NO-GO recommendation
consumes: the pull request (diff, description, linked work items), the requirement it claims to implement, the repository's conventions and hooks
argument-hint: <pr-number-or-url> [--repo <path>] [--post]
graph:
  consumes: [input:pull-request, doc:requirement-source, profile:active]
  produces: [artifact:reviews/pr-review.md]
  delegates: [agent:code-reviewer]
  next: [skill:ship-change, skill:green-run]
  scope: [repo:*]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# PR Review (dev track)

## Why

`/review-code` reviews a working tree before it ships; this reviews the unit
the team actually merges. A pull request carries claims — a description, a
linked requirement, test evidence — and the review's job is to check the
claims against the diff, which is precisely what a tired approver skimming
green checkmarks does not do.

## What

`pr-review.md`: what the PR claims versus what the diff does, requirement
coverage by AC id where an analysis exists, findings on the PROBE severity
ladder, the downstream-invalidation list the change implies, and a GO / NO-GO
recommendation — evidence for the human approver, never a merge.

## When

Run when a PR is opened or updated — typically after `/ship-change` opened it,
or on a teammate's PR before approving it. Distinct from `/review-code` (a
working tree, pre-PR) and from `/audit-scripts` (test code).

## Where

Read the PR through the host CLI; write the review artifact locally. Posting
anything to the host happens only under `--post` with explicit authorization.

## How

Resolve the host, pull the PR's diff and claims, review the diff with the
code-reviewer agent against the requirement, reconcile claims with evidence,
and close with a recommendation in one of the four D12 states.

## Host resolution

Read the repo's `origin` remote — never guess the host:

- `github.com` → `gh pr view/diff/checks` (and `gh pr review` only under
  `--post`);
- `visualstudio.com` / `dev.azure.com` → `az repos pr show` /
  `az repos pr diff` (and comment threads only under `--post`);
- anything else → report the host unsupported and review a locally supplied
  diff instead (`git diff <base>...<head>`), saying so in the artifact.

A missing CLI or failed authentication is `BLOCKED` with the exact command and
error — never silently reviewed-from-nothing.

## Procedure

1. **Freeze the subject.** Fetch the PR's head/base, diff, description, linked
   work items, and check results. Record the head commit in the review header
   — a review is of a commit, not of a moving branch.
2. **Find the requirement.** The linked PRD/spec analysis when one exists
   (the description should cite it); otherwise the description's own stated
   intent is the requirement of record, and the review says so.
3. **Claims versus diff.** Read the description first, then verify each claim
   against the diff: files it says it touches, behavior it says it adds, tests
   it says it added, migrations it says it registered. An unclaimed
   significant change — the drive-by refactor, the quiet dependency bump — is
   a finding on its own.
4. **Review the diff** via the **code-reviewer** agent with the requirement
   and the active profile. Findings rank on the PROBE severity ladder;
   wrong-data risks are `blocker` here exactly as everywhere else.
5. **Check the evidence.** CI/check results as reported by the host; test
   evidence in the PR against what the diff actually exercises. A green check
   that does not cover the changed behavior is reported as exactly that.
6. **Name what this invalidates downstream** (policy D6): feature files, TC
   ids, locator inventories, recon artifacts, fixtures — the list the QA track
   routes, never edits from here.
7. **Write `pr-review.md`** with the recommendation: `GO` (approve-worthy as
   evidence), `GO with notes`, or `NO-GO` with the blocking findings. Post to
   the host only under `--post` and explicit authorization in the invoking
   request; the artifact stands either way. Close in one D12 state.

## Boundaries

- **Recommendation, not merge.** This skill never approves, merges, or closes
  a PR. The human approver decides; the branch protection rules are the
  host's.
- Review the PR as a reviewer even when this session authored it — and say in
  the header when that independence is compromised (same-session authorship is
  recorded, exactly as D5 requires of `/review-code`).
- Comments posted under `--post` are the artifact's findings verbatim — never
  a softened summary that hides a `NO-GO` behind politeness.
