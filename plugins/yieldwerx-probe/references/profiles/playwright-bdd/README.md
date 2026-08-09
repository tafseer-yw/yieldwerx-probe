# Playwright BDD compatibility profile

Load this profile only when `probe.config.yaml` selects `playwright-bdd`.

- `rules/` contains locator, chart and code conventions from the original
  framework.
- `docs/` contains visual regression, bug lifecycle and UI-impact references.
- Consumer commands remain authoritative; this profile never assumes a script
  exists merely because the original framework had one.

Plotly, Jenkins and AIO examples are compatibility guidance, not generic PROBE
requirements.
