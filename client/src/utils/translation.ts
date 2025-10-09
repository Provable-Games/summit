import { hexToAscii } from "@dojoengine/utils";

const parseData = (values: string[], type: string): any => {
  const value = values.splice(0, 1)[0];

  switch (type) {
    case 'string':
      return hexToAscii(value);
    case 'number':
      return parseInt(value);
    case 'boolean':
      return Boolean(parseInt(value));
    case 'bigint':
      return BigInt(value);
  }

  return value;
}

const parseEventField = (values: string[], type: any): any => {
  if (typeof type === 'string' && type.startsWith('array')) {
    return parseArray(values, type);
  }

  if (typeof type === 'string' && components[type]) {
    return parseComponent(values, type);
  }

  return parseData(values, type);
}

const parseArray = (values: string[], arrayType: string): any[] => {
  const baseType = arrayType.replace('array_', '');
  const length = parseInt(values.splice(0, 1)[0]);
  let result = [];

  for (let i = 0; i < length; i++) {
    if (components[baseType]) {
      result.push(parseComponent(values, baseType));
    } else {
      result.push(parseData(values, baseType));
    }
  }

  return result;
}

const parseComponent = (values: string[], componentType: string): any => {
  const component = components[componentType];
  if (!component) {
    throw new Error(`Unknown component type: ${componentType}`);
  }

  const parsedFields = Object.keys(component).reduce((acc: any, key: string) => {
    return {
      ...acc,
      [key]: parseEventField(values, component[key])
    };
  }, {});

  return parsedFields;
}

const gameEventList = [
  'summit',
  'attack',
  'feed',
]

export const components: any = {
  'GameEvent': {
    summit_id: 'number',
    details: null,
  },
  'SummitEvent': {
    beast: "beast_event",
    live_stats: "beast_stats",
    owner: null,
    timestamp: 'number',
    defending_beast_token_id: 'number',
  },
  'AttackEvent': {
    beast: "beast_event",
    live_stats: "beast_stats",
    summit_live_stats: "beast_stats",
    attack_potions: 'number',
    damage: 'number',
    defending_beast_token_id: 'number',
    owner: null,
    timestamp: 'number',
  },
  'FeedEvent': {
    beast: "beast_event",
    live_stats: "beast_stats",
    health_increase: 'number',
    adventurer_count: 'number',
    owner: null,
    timestamp: 'number',
  },
  "beast_event": {
    id: 'number',
    prefix: 'number',
    suffix: 'number',
    level: 'number',
    health: 'number',
    shiny: 'number',
    animated: 'number',
  },
  "beast_stats": {
    token_id: 'number',
    current_health: 'number',
    bonus_health: 'number',
    bonus_xp: 'number',
    attack_streak: 'number',
    last_death_timestamp: 'number',
    num_deaths: 'number',
    last_killed_by: 'number',
    revival_count: 'number',
    extra_lives: 'number',
    has_claimed_starter_kit: 'boolean',
    rewards_earned: 'number',
  },
}

export const translateGameEvent = (event: any, manifest: any): any => {
  const eventDefinition = manifest.events.find((definition: any) => definition.selector === event.keys[1]);
  const name = eventDefinition?.tag?.split('-')[1];
  const data = event.data;

  if (name !== 'GameEvent') {
    return undefined;
  }

  const keysNumber = parseInt(data[0]);
  let values = [...data.slice(1, 1 + keysNumber), ...data.slice(keysNumber + 2)];

  const action_count = parseInt(values[1]);
  const type = gameEventList[parseInt(values[2])];

  values = values.slice(3);

  const parsedFields = parseComponent(values, type);

  let result: any = {
    type,
    action_count,
  }

  result = {
    ...result,
    ...parsedFields
  }

  return result;
}