# PRD — Wafer Upload Status Board

## Status

The lifecycle state and who moved it there.

- **State:** signed-off
- **Owner:** Tafseer Haider
- **Signed off by:** Tafseer Haider — 2026-08-18 21:30
- **Revision note:** 2026-08-18 first signed version.

## Problem

What hurts today, in plain words, and what it costs.

When an engineer uploads a wafer file, the system says nothing about how far
processing has gone. Engineers wait, guess, and re-upload files that were never
stuck, which creates duplicate work for the support team roughly ten times a
week and delays yield reports by up to an hour.

## What we will build

The change, described in the product's own words.

A "Upload Status" board that shows every file uploaded in the last day, with a
plain status for each: "Waiting", "Loading", "Analyzing", "Done", or "Failed".
An engineer can open the board from the "Dashboard" menu and see at a glance
whether their file needs attention.

## Who it is for

The roles that will touch this, and what each gets.

| Role | What this gives them |
| ---- | -------------------- |
| Yield engineer | Certainty about whether an upload finished |
| Support team | Fewer duplicate-upload tickets |

## User stories

The behavior, one story at a time. IDs are stable forever.

### US-01 — See my uploads

**As a** yield engineer, **I want** to see the files I uploaded today with a
plain status each, **so that** I know whether to wait or act.

**In plain words:** After sending a wafer data file into the system, the
engineer today has no window into what happens next. This story gives them a
simple list, like a parcel-tracking page, that says how far each file has got.

**Done means:**

- The board lists every file the signed-in engineer uploaded in the last 24
  hours.
- Each file shows exactly one status: "Waiting", "Loading", "Analyzing",
  "Done", or "Failed".
- A "Failed" row shows the reason in one sentence.

### US-02 — Failure reasons a person can act on

**As a** yield engineer, **I want** a failed upload to tell me why in plain
words, **so that** I can fix the file instead of calling support.

**In plain words:** Today a failed file just disappears, and the engineer finds
out when a report is missing. This story makes the failure visible and states
the reason — a wrong file type, a duplicate, a broken row — in words that say
what to do next.

**Done means:**

- Every "Failed" status carries a one-sentence reason.
- The reason names the file problem, not the internal step that raised it.

## Scope

What is included in this change.

- The status board screen, reachable from the "Dashboard" menu.
- Statuses for files uploaded after this feature ships.

## Out of scope

What is deliberately not included — named, so nobody discovers it in QA.

- Statuses for files uploaded before this feature ships.
- Email or chat notifications about status changes.

## Success measures

How we will know it worked, in numbers where possible.

| Measure | Today | Target |
| ------- | ----- | ------ |
| Duplicate-upload support tickets per week | ~10 | under 2 |

## Open questions

What must be settled before build or test can be trusted.

| Q | Question | Who can answer | Recommended answer | Why | Status |
| -- | -------- | -------------- | ------------------ | --- | ------ |
| Q-01 | How long do statuses stay on the board? | Product owner | 7 days | Matches the report retention window the team already uses | open |

## Terms

The product's own words for the things in this document.

| Term (exactly as the product writes it) | Plain meaning | Where used |
| --------------------------------------- | ------------- | ---------- |
| Dashboard | The landing screen after signing in. | Menu |
| Upload Status | The new board this document describes. | This document |
