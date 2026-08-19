# Spec reconciliation — Profile picture

## Summary

- **Mode:** reconcile
- **Result:** substantive
- **Feature:** profile-picture
- **Run date:** 2026-07-30

## Sources compared

- **Existing analysis:** .probe/artifacts/profile-picture/10-spec/spec-analysis.md
- **Existing analysis revision:** revision 4
- **Existing analysis SHA-256:** aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- **Approved source:** docs/requirements/profile-picture.md
- **Approved source revision:** revision 5

## Change register

| Item          | Change          | Old source | New source | Reason                 | Downstream action                         |
| ------------- | --------------- | ---------- | ---------- | ---------------------- | ----------------------------------------- |
| AC-01         | format-only     | §3.1       | §3.1       | Added current AC shape | None                                      |
| AC-02 → AC-09 | meaning-changed | §3.2       | §3.2       | Allowed values changed | Run `/yw:update-cases` for AC-02 and AC-09 |

## Downstream impact

- **Cases:** Update cases linked to AC-02 and add coverage for AC-09
- **Design Gate:** Review and re-sign affected coverage
- **Scripts and run evidence:** Review linked scripts and mark old results stale
- **External case sync:** Resync linked AIO cases after amendment

## Validation

- **Spec analysis validator:** pass
- **Reconciliation validator:** pass
- **Unresolved questions:** 0
