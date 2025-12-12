/**
 * Shared type definitions for the library.
 *
 * This module provides the core data structures used throughout the library.
 * It serves as the single source of truth for type definitions, ensuring
 * consistency across all layers (Fetcher, Store, Repository).
 *
 * ## Main Export
 *
 * - {@link NormalizedPrototype} — The standardized shape of a prototype
 *   after normalization from ProtoPedia API responses.
 *
 * ## Type Characteristics
 *
 * - **Type Safety**: Strongly typed with clear required/optional field distinction
 * - **Normalization**: Pipe-separated strings converted to arrays, timestamps to UTC ISO 8601
 * - **Strict Typing**: Compatible with TypeScript's `exactOptionalPropertyTypes: true`
 * - **Cross-Layer Consistency**: Used uniformly across Fetcher, Store, and Repository
 *
 * ## Usage
 *
 * @example
 * ```typescript
 * import type { NormalizedPrototype } from '@f88/promidas/types';
 *
 * function processPrototype(prototype: NormalizedPrototype) {
 *   // Required fields are always accessible
 *   console.log(prototype.id, prototype.prototypeNm);
 *
 *   // Array fields are type-safe
 *   prototype.tags.forEach(tag => console.log(tag)); // tag is string
 *
 *   // Optional fields require undefined checks
 *   if (prototype.releaseDate !== undefined) {
 *     console.log(new Date(prototype.releaseDate));
 *   }
 * }
 * ```
 *
 * ## Data Transformation
 *
 * This type represents data after normalization:
 *
 * - **Raw API data** (`UpstreamPrototype`) → `normalizePrototype()` → **Normalized data** (`NormalizedPrototype`)
 * - Pipe-separated strings (`"tag1|tag2"`) → Arrays (`["tag1", "tag2"]`)
 * - JST timestamps (`"2025-12-12 09:00:00.0"`) → UTC ISO 8601 (`"2025-12-12T00:00:00.000Z"`)
 *
 * @module
 * @see {@link NormalizedPrototype} for detailed field documentation
 * @see {@link ../fetcher/index.js} for normalization utilities
 */

export type { NormalizedPrototype } from './normalized-prototype.js';
