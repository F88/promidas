import type { EventEmitter } from 'events';

import type { Logger } from '../../logger/index.js';
import { sanitizeDataForLogging } from '../../utils/logger-utils.js';
import type { RepositoryEvents } from '../types/index.js';

export const emitRepositoryEventSafely = <
  EventName extends keyof RepositoryEvents,
>(
  events: EventEmitter | undefined,
  logger: Logger,
  eventName: EventName,
  ...args: Parameters<RepositoryEvents[EventName]>
): void => {
  if (!events) {
    return;
  }

  try {
    events.emit(eventName, ...args);
  } catch (error) {
    logger.error('Repository event emission failed', {
      eventName,
      error: sanitizeDataForLogging(error),
      args: sanitizeDataForLogging(args),
    });
  }
};
