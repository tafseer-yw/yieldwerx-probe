# Contributing

Changes land through pull requests to protected `main`.

1. Create a focused branch.
2. Update the process authority and every affected skill in the same change.
3. Preserve stable stage, AC, category and test-case identities.
4. Keep framework-specific instructions inside a compatibility profile.
5. Never add credentials, customer data, human signatures or fabricated
   external IDs.
6. Run `npm test` and `claude plugin validate .` when the Claude CLI is
   available.
7. Update `CHANGELOG.md` and the plugin version for a release.

Ownership is documented in `CODEOWNERS`; Azure Repos branch policies provide
the enforceable reviewer requirements.
