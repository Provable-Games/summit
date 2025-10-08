
export interface GameEvent {
  type: 'summit' | 'attack' | 'feed' | 'unknown';
}

export const processGameEvent = (event: any): GameEvent => {
  const { variant } = event.details;

  if ('attack' in variant) {
    return {
      type: 'attack',
      ...variant.attack
    };
  }

  else if ('summit' in variant) {
    return {
      type: 'summit',
      ...variant.summit
    };
  }

  else if ('feed' in variant) {
    return {
      type: 'feed',
      ...variant.feed
    };
  }

  return { type: 'unknown' };
}
