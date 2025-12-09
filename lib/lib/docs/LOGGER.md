---
lang: en
title: Logger Usage
title-en: Logger Usage
title-ja: Loggerの使用法
related:
    - ../../../README.md "Project Overview"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Logger Usage

- The library ships with a minimal, dependency-free logger interface
  defined in `lib/lib/logger.types.ts`.
- A default implementation is provided via `createConsoleLogger` in
  `lib/lib/logger.ts`.
- Log levels:
    - `debug`, `info`, `warn`, `error`, `silent`.
- The `Logger` interface exposes the following methods:
    - `debug(message: string, meta?: unknown)`
    - `info(message: string, meta?: unknown)`
    - `warn(message: string, meta?: unknown)`
    - `error(message: string, meta?: unknown)`
- In environments where logging is not desired, `createNoopLogger`
  returns a logger that discards all messages.
