
export interface GameEvent {
  type: 'summit' | 'attack' | 'feed' | 'unknown';
}

interface EventVariant {
  attack?: Record<string, unknown>;
  summit?: Record<string, unknown>;
  feed?: Record<string, unknown>;
}

interface RawEvent {
  details?: {
    variant?: EventVariant;
  };
}

export const processGameEvent = (event: RawEvent): GameEvent => {
  const variant = event.details?.variant;
  if (!variant) {
    return { type: 'unknown' };
  }

  if ('attack' in variant) {
    return {
      type: 'attack',
      ...(variant.attack ?? {})
    };
  }

  else if ('summit' in variant) {
    return {
      type: 'summit',
      ...(variant.summit ?? {})
    };
  }

  else if ('feed' in variant) {
    return {
      type: 'feed',
      ...(variant.feed ?? {})
    };
  }

  return { type: 'unknown' };
}
