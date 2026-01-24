import type { Logger, LogLevel } from '../../logger/index.js';

/**
 * Configuration options for the PrototypeInMemoryStore.
 */
export type PrototypeInMemoryStoreConfig = {
  /**
   * TTL in milliseconds after which the cached snapshot is considered expired.
   * @default 1800000 (30 minutes)
   */
  readonly ttlMs?: number;

  /**
   * Maximum allowed data size in bytes for storing snapshots.
   * @default 10485760 (10 MiB)
   */
  readonly maxDataSizeBytes?: number;

  /**
   * Custom logger instance.
   *
   * @remarks
   * - If provided, the logger will be used as-is
   * - If provided with logLevel, the level will be updated if logger is mutable
   * - If not provided, creates a ConsoleLogger with the specified logLevel
   *
   * @default undefined (creates ConsoleLogger with 'info' level)
   */
  readonly logger?: Logger;

  /**
   * Log level for creating a default ConsoleLogger.
   *
   * @remarks
   * - Only used when `logger` is NOT provided
   * - Creates a new ConsoleLogger with this level
   * - If logger is provided and mutable, updates its level property
   *
   * @default 'info'
   */
  readonly logLevel?: LogLevel;
};
