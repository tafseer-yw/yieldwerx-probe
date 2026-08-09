# Spec analysis — Profile picture

## Summary

The user can choose and save a profile picture.

## Sources and revisions

The provided requirement authority and reference context.

- **Requirement source of truth:** Profile_Picture_Requirements.docx, revision 3
- **Reference context consulted:** yieldwerx-knowledgebase 1.1.0 — Reference context only — not a requirement

## Testable categories

The groups of testing for this feature.

| CAT    | Name             | ACs          | Where to check | Product terms   | Test data needed              | How to know the correct result  | Difficulty |
| ------ | ---------------- | ------------ | -------------- | --------------- | ----------------------------- | ------------------------------- | ---------- |
| CAT-01 | Profile pictures | AC-01, AC-02 | Profile screen | Profile picture | Valid and invalid image files | Compare with the approved rules | low        |

## Acceptance criteria

What the product must do, per the spec.

| AC    | Format      | Requirement                | Source | Where to check | Best test level | Status |
| ----- | ----------- | -------------------------- | ------ | -------------- | --------------- | ------ |
| AC-01 | Workflow    | Save a valid picture       | §3.1   | Profile screen | e2e             | active |
| AC-02 | Simple Rule | Allow supported file types | §3.2   | Upload field   | component       | active |

### AC-01 — Save a valid picture

**Summary:** Verify that a user can save a valid profile picture.
**Format:** Workflow

```gherkin
Given The user is on the Edit Profile screen
And The user has selected a .png picture no larger than 5 MB
When The user clicks the "Save Profile" button
Then The selected picture is saved
And The picture is displayed on the user's profile
```

### AC-02 — Allow supported file types

**Summary:** Verify that only .png and .jpeg profile pictures are accepted.
**Format:** Simple Rule

```gherkin
Given The user is on the Edit Profile screen
When The user selects a profile picture
Then The picture must be in `.png` or `.jpeg` format
And Every other file type must be rejected
```

## Other things to consider

None.

## Where to check each requirement

| AC    | Where to check | How to know the correct result |
| ----- | -------------- | ------------------------------ |
| AC-01 | Profile screen | Reopen the profile             |
| AC-02 | Upload field   | Compare with the approved list |

## Unclear wording

None.

## Open questions

None.

## Product and test data notes

- **Feature group:** User profile
- **Items and IDs:** User account and profile picture
- **Required order and dependencies:** The user must sign in first
- **Where to check results:** Profile screen

## Out of scope

None declared in source.
