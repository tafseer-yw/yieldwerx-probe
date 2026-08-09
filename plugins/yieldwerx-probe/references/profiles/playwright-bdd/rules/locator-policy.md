---
paths:
  - 'src/pages/**'
  - 'src/components/**'
  - 'steps/**'
---

# Locator policy (hard rule — Script Audit fails violations at `high`)

1. `page.getByTestId(...)` — **default for everything interactive/assertable.**
   `data-testid` is mandatory on application chrome: filters, buttons, grids,
   dialogs, menus, inputs. Playwright treats testIds as optional; we do not.
2. `getByRole(...)` — only for genuinely semantic elements (rows, columnheaders,
   links, alerts, options).
3. Everything else (raw CSS, XPath, text selectors) — **forbidden**; ESLint
   errors on `.locator('...')` in pages/components/steps. An eslint-disable
   requires a written justification and is reviewed at the Merge Gate.

**Plotly exception:** chart internals cannot carry testIds. ALL chart
interaction/assertion goes through `src/plotly/` utilities — never query chart
DOM from steps. The chart's **container div** still requires a testId.
testId gaps found during UI Recon become dev-team tickets; testId coverage for
the feature under test is a hard Merge-Gate checklist item (waivable only with
a ledger entry).
