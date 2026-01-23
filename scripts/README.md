# Scripts Directory

This directory contains utility scripts for development, testing, and maintenance of PROMIDAS.

## Categories

### 🏗 Build & CI

Scripts used for project build processes, CI checks, and validation.

| Script                            | Description                                                                      | Usage                 |
| :-------------------------------- | :------------------------------------------------------------------------------- | :-------------------- |
| **`generate-version.mjs`**        | Helper script to generate version files during the build process.                | (Internal build step) |
| **`validate-vitepress-links.ts`** | Validates links (internal/external/anchor) in VitePress documentation (`docs/`). | `npm run docs:verify` |

### 🛠 Development & Playground

Scripts used manually by developers to verify logic or experiment with the library.

| Script                             | Description                                                                  | Usage                                          |
| :--------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------- |
| **`test-progress.ts`**             | Verifies the download progress tracking functionality of the API client.     | `npx tsx scripts/test-progress.ts`             |
| **`try-protopedia-repository.ts`** | Integration test / Playground script to verify Repository behavior manually. | `npx tsx scripts/try-protopedia-repository.ts` |

### 📊 Data Utilities

Tools for fetching real data from the API and analyzing its structure.

| Script                   | Description                                                                              | Usage                                    |
| :----------------------- | :--------------------------------------------------------------------------------------- | :--------------------------------------- |
| **`analyze-json.ts`**    | Analyzes a JSON data file to report field usage statistics (presence rate, types, etc.). | `npx tsx scripts/analyze-json.ts <file>` |
| **`get-sample-data.ts`** | Fetches real data from ProtoPedia API and saves it as JSON/TSV for testing/analysis.     | `npx tsx scripts/get-sample-data.ts`     |

## Prerequisites

Most scripts require `tsx` to run naturally with TypeScript support.
Some scripts processing API data require `PROTOPEDIA_API_V2_TOKEN` in `.env`.

```bash
# Install dependencies
npm install

# Run a script
npx tsx scripts/<script-name>.ts
```
