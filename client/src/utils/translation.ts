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

export const components: any = {
  'BattleEvent': {
    attacking_beast_token_id: 'number',
    attack_index: 'number',
    attacking_beast_owner: null,
    attacking_beast_id: 'number',
    shiny: 'number',
    animated: 'number',
    defending_beast_token_id: 'number',
    attack_count: 'number',
    attack_damage: 'number',
    critical_attack_count: 'number',
    critical_attack_damage: 'number',
    counter_attack_count: 'number',
    counter_attack_damage: 'number',
    critical_counter_attack_count: 'number',
    critical_counter_attack_damage: 'number',
    attack_potions: 'number',
    xp_gained: 'number',
  },
  'LiveBeastStatsEvent': {
    event_id: 'number',
    token_id: 'number',
    current_health: 'number',
    bonus_health: 'number',
    bonus_xp: 'number',
    attack_streak: 'number',
    last_death_timestamp: 'number',
    revival_count: 'number',
    extra_lives: 'number',
    has_claimed_potions: 'boolean',
    blocks_held: 'number',
    stats: 'Stats',
  },
  'Stats': {
    spirit: 'number',
    luck: 'number',
    specials: 'boolean',
    wisdom: 'boolean',
    diplomacy: 'boolean',
  },
}

export const translateGameEvent = (event: any, manifest: any, address: string): any => {
  const eventDefinition = manifest.events.find((definition: any) => definition.selector === event.keys[1]) || manifest.models.find((model: any) => model.selector === event.keys[1]);
  let name = eventDefinition?.tag?.split('-')[1];

  if (!name && event.from_address === address) {
    return {
      componentName: 'Summit',
      attack_potions: parseInt(event.data[event.data.length - 3], 16),
      revival_potions: parseInt(event.data[event.data.length - 2], 16),
      extra_life_potions: parseInt(event.data[event.data.length - 1], 16),
    }
  }

  if (!components[name]) return;

  const data = event.data;
  const keysNumber = parseInt(data[0]);
  let values = [...data.slice(1, 1 + keysNumber), ...data.slice(keysNumber + 2)];

  const parsedFields = parseComponent(values, name);

  const result = {
    componentName: name,
    ...parsedFields
  }

  return result;
}