# Failure evidence contract

Use this contract for Playwright MCP-assisted case execution, runner failures,
flake triage, and bug reporting. It keeps capture, classification, and external
filing separate.

## Capture order

Capture evidence before retry, refresh, navigation, cleanup, or state repair:

1. UTC timestamp, run ID, test-case ID, AC IDs, environment, build/commit,
   browser, viewport, role, tenant boundary, and sanitized test-data identity.
2. Exact failing Gherkin step index, keyword, and text, plus the last successful
   step and all prior step verdicts.
3. Expected result, actual result, error/message, current URL, and visible UI
   state.
4. Failure-point screenshot; full-page screenshot and accessibility/DOM
   snapshot when the connector supports them.
5. Relevant browser console messages and uncaught page errors.
6. Sanitized first-party requests/responses around the failure: method,
   normalized URL, status, content type, timing, correlation ID, and payload
   shape. Do not retain credentials or raw sensitive bodies.
7. Backend/application logs only from a configured authorized source. State
   `unavailable - <reason>` when absent; browser console output is not a
   substitute.
8. Created/mutated record IDs, cleanup result, and whether the state is safe for
   another case.

## Evidence packet

Store each occurrence under
`50-exploratory/executions/failures/<fingerprint>/`. Use `evidence.json` as the
machine-readable index and keep large binary evidence beside it.

```json
{
  "schemaVersion": 1,
  "fingerprint": "fp-<stable-hash>",
  "occurrenceId": "<run-id>-<tc-id>",
  "capturedAt": "<UTC ISO-8601>",
  "source": "playwright-mcp-assisted",
  "feature": "<feature-slug>",
  "testCase": {
    "id": "<TC-id>",
    "aioKey": null,
    "acceptanceCriteria": ["<AC-id>"],
    "scenario": "<exact scenario title>"
  },
  "execution": {
    "environment": "<name>",
    "build": "<version-or-commit>",
    "browser": "<name/version>",
    "role": "<role>",
    "tenant": "<redacted-safe-identifier>",
    "correlationId": null
  },
  "failure": {
    "lastSuccessfulStep": { "index": 2, "keyword": "When", "text": "<text>" },
    "failingStep": { "index": 3, "keyword": "Then", "text": "<text>" },
    "expected": "<expected>",
    "actual": "<actual>",
    "error": "<sanitized message>",
    "classification": "unknown",
    "rootCauseStatus": "unknown",
    "rootCause": null,
    "triageNotes": "<evidence-backed notes>"
  },
  "evidence": {
    "failureScreenshot": "<relative path>",
    "fullPageScreenshot": null,
    "snapshot": null,
    "console": "<relative path or unavailable reason>",
    "pageErrors": "<relative path or unavailable reason>",
    "network": "<relative path or unavailable reason>",
    "applicationLogs": "<relative path or unavailable reason>"
  },
  "data": {
    "createdOrMutated": [],
    "cleanup": "not-required | complete | failed | retained-with-authorization"
  },
  "redaction": {
    "status": "complete",
    "notes": "<what was removed or why an item was excluded>"
  }
}
```

Use the existing schema-v3 BugCandidate builder when promoting an application
defect. The packet is evidence input; it does not replace that validated
candidate contract.

## Classification and RCA

- `classification` says which system currently owns the failure:
  `app-bug`, `test-bug`, `sync-gap`, `data`, `environment`, `infra`, or
  `unknown`.
- `rootCauseStatus: confirmed` requires direct evidence of the mechanism.
  Otherwise use `suspected` or `unknown` and describe the next diagnostic step.
- A reproducible mismatch proves a defect only when the expected result is
  independently supported by the approved requirement/oracle.
- Intermittent behavior goes through `/flake-triage`; product nondeterminism may
  still be an `app-bug`.

## Bug/RCA presentation

When `/bug-report` consumes the packet, present:

1. Test case, AC/AIO traceability, build, environment, role, and sanitized data.
2. Exact failing Gherkin step and last successful step.
3. Reproduction steps from a clean state.
4. Independently supported expected result and observed actual result.
5. Failure analysis: classification, severity, frequency, impact, and evidence.
6. Root cause with explicit `confirmed | suspected | unknown` status.
7. Corrective direction and regression scope when supported; do not prescribe a
   code fix without evidence.
8. Linked, redacted evidence and any unavailable-evidence gaps.

Create and preview a tracker candidate only after classification. Never file or
attach evidence externally without fresh human authorization.
