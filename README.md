# Platform Config Check

A client-side heuristic QA for cloud and data platform configs, built with EaseCloud's problem in mind: engineers who own systems end to end, across Kubernetes, Terraform, Airbyte, Snowflake and dbt, need the embarrassing config mistakes caught before production catches them.

Paste config lines as `file | <line>`, one per line, and the tool flags:

- **HARDCODED_SECRET_HINT** - a credential-looking literal in config
- **PUBLIC_ACCESS_HINT** - public access apparently enabled on a bucket/dataset
- **UNPINNED_VERSION** - a dependency or provider version left floating
- **LATEST_TAG** - a container image pinned to :latest
- **WILDCARD_SELECT** - SELECT * in a model
- **MODELS_WITHOUT_TESTS** - SQL models pasted with no test/assertion config anywhere
- **NO_RETRY_HINT** - pipeline/sync config with no retry/backoff hint
- **UNPARSED** - lines that do not match the expected format

Plain HTML, CSS and JavaScript. No build step, no external services.

## Run

Open `index.html` in a browser, paste config lines, click "Run config check".

## Test

```
npm test
```

## Limitations

This is a line-level pattern screen, not a config audit:

- It matches single lines; it cannot follow variables, modules or cross-file references. Every finding says "verify".
- A secret pulled from a vault reference will not be flagged; a harmless string that looks like a key will be.
- Absence of a test or retry hint in the pasted lines does not prove it is missing from the project - it only inspects what you paste.
- Tests verify the rules match their intended sample patterns; they do not prove real misconfigurations are found.
