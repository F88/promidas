/**
 * Error classes for PrototypeInMemoryStore operations.
 *
 * @module
 */

/**
 * Represents the state of stored data when an error occurs.
 *
 * - `UNCHANGED`: The store's existing data remains intact and unmodified
 * - `UNKNOWN`: The data state is unknown or unspecified (for future extensions)
 */
export type StoreDataState = 'UNCHANGED' | 'UNKNOWN';

/**
 * Base error class for PrototypeInMemoryStore operations.
 *
 * All store-specific errors extend this class, allowing callers to catch
 * all store errors with a single catch block if desired. Each error includes
 * a `dataState` property indicating whether the store's data was affected.
 *
 * @example
 * ```typescript
 * try {
 *   store.setAll(prototypes);
 * } catch (error) {
 *   if (error instanceof StoreError) {
 *     console.error('Store operation failed:', error.message);
 *     console.log('Data state:', error.dataState); // 'UNCHANGED' or 'UNKNOWN'
 *   }
 * }
 * ```
 */
export class StoreError extends Error {
  /**
   * Indicates the state of the store's data when this error occurred.
   */
  public readonly dataState: StoreDataState;

  /**
   * Creates a new StoreError.
   *
   * @param message - Human-readable error message
   * @param dataState - State of the store's data (defaults to 'UNKNOWN')
   * @param options - Error options, including the original error cause for debugging
   */
  constructor(
    message: string,
    dataState: StoreDataState = 'UNKNOWN',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'StoreError';
    this.dataState = dataState;
  }
}

/**
 * Thrown when store configuration is invalid.
 *
 * This error indicates that the configuration provided to the store
 * constructor contains invalid values. Common causes include exceeding
 * maximum allowed limits or providing incompatible settings.
 *
 * This error is thrown before the store is created, so no data state applies.
 *
 * @example
 * ```typescript
 * try {
 *   const store = new PrototypeInMemoryStore({
 *     maxDataSizeBytes: 50 * 1024 * 1024, // 50 MiB exceeds 30 MiB limit
 *   });
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.error('Invalid configuration:', error.message);
 *   }
 * }
 * ```
 */
export class ConfigurationError extends StoreError {
  /**
   * Creates a new ConfigurationError.
   *
   * @param message - Human-readable error message describing the configuration issue
   */
  constructor(message: string) {
    super(message, 'UNKNOWN');
    this.name = 'ConfigurationError';
  }
}

/**
 * Thrown when snapshot data size exceeds the configured maximum limit.
 *
 * This error indicates that the prototypes being stored exceed the
 * `maxDataSizeBytes` limit configured for the store. The error includes
 * both the actual data size and the maximum allowed size for debugging.
 *
 * When this error is thrown, the store's data remains UNCHANGED.
 *
 * @example
 * ```typescript
 * try {
 *   store.setAll(prototypes);
 * } catch (error) {
 *   if (error instanceof DataSizeExceededError) {
 *     console.error(
 *       `Data too large: ${error.dataSizeBytes} bytes ` +
 *       `(max: ${error.maxDataSizeBytes} bytes)`
 *     );
 *     console.log('Previous data intact:', error.dataState === 'UNCHANGED');
 *   }
 * }
 * ```
 */
export class DataSizeExceededError extends StoreError {
  /**
   * Actual size of the data in bytes.
   */
  public readonly dataSizeBytes: number;

  /**
   * Maximum allowed size in bytes.
   */
  public readonly maxDataSizeBytes: number;

  /**
   * Creates a new DataSizeExceededError.
   *
   * @param dataState - State of the store's data
   * @param dataSizeBytes - Actual size of the data in bytes
   * @param maxDataSizeBytes - Maximum allowed size in bytes
   */
  constructor(
    dataState: StoreDataState,
    dataSizeBytes: number,
    maxDataSizeBytes: number,
  ) {
    super(
      `Snapshot data size (${dataSizeBytes} bytes) exceeds maximum limit (${maxDataSizeBytes} bytes)`,
      dataState,
    );
    this.name = 'DataSizeExceededError';
    this.dataSizeBytes = dataSizeBytes;
    this.maxDataSizeBytes = maxDataSizeBytes;
  }
}

/**
 * Thrown when data size estimation fails.
 *
 * This error indicates that the store was unable to calculate the size
 * of the prototypes being stored, typically due to JSON serialization
 * failures (e.g., circular references, unsupported types).
 *
 * When this error is thrown, the store's data remains UNCHANGED.
 *
 * @example
 * ```typescript
 * try {
 *   store.setAll(prototypes);
 * } catch (error) {
 *   if (error instanceof SizeEstimationError) {
 *     console.error('Cannot estimate data size:', error.cause);
 *     console.log('Previous data intact:', error.dataState === 'UNCHANGED');
 *   }
 * }
 * ```
 */
export class SizeEstimationError extends StoreError {
  /**
   * Creates a new SizeEstimationError.
   *
   * @param dataState - State of the store's data (defaults to 'UNKNOWN')
   * @param cause - The underlying error that caused the estimation to fail
   */
  constructor(dataState: StoreDataState = 'UNKNOWN', cause?: Error) {
    super('Failed to estimate data size for snapshot', dataState, { cause });
    this.name = 'SizeEstimationError';
  }
}
