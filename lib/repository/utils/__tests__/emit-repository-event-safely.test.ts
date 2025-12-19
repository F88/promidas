import { EventEmitter } from 'events';

import { describe, expect, it, vi } from 'vitest';

import type { PrototypeInMemoryStats } from '../../../store/index.js';
import { emitRepositoryEventSafely } from '../emit-repository-event-safely.js';

describe('emitRepositoryEventSafely', () => {
  it('does nothing when events is undefined', () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    expect(() => {
      emitRepositoryEventSafely(undefined, logger, 'snapshotStarted', 'setup');
    }).not.toThrow();

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('swallows listener exceptions and logs them', () => {
    const events = new EventEmitter();
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    const stats: PrototypeInMemoryStats = {
      size: 1,
      cachedAt: new Date(),
      isExpired: false,
      remainingTtlMs: 50_000,
      dataSizeBytes: 1000,
      refreshInFlight: false,
    };

    events.on('snapshotCompleted', () => {
      throw new Error('listener boom');
    });

    expect(() => {
      emitRepositoryEventSafely(events, logger, 'snapshotCompleted', stats);
    }).not.toThrow();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Repository event emission failed',
      expect.objectContaining({
        eventName: 'snapshotCompleted',
      }),
    );
  });
});
