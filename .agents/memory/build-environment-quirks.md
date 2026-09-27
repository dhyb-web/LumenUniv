---
name: Build environment quirks
description: Small compatibility constraints found while bringing the generated API client and Drizzle schema online.
---

The generated fetch client uses `Headers.entries()`, so its TypeScript lib configuration must include `dom.iterable` alongside `dom`.

**Why:** The workspace TypeScript defaults do not include iterable DOM declarations, and the generated client otherwise fails the library typecheck even though the OpenAPI generation succeeds.

**How to apply:** When a generated browser client reports missing `Headers` iterator APIs, fix the package lib configuration rather than editing generated output.

The installed Drizzle version exposes the PostgreSQL index builder as `index`, not `pgIndex`.

**Why:** Schema examples from other Drizzle versions may use a different helper name, causing a compile failure during the first schema push.

**How to apply:** Check the installed Drizzle typings when adding table indexes; prefer the exported helper in the current package.