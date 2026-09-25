import { entityRef } from './entities.mjs';

// Current-patch mechanics from the Valve datafeed for the entities of this match:
// the selected hero in full, the other heroes' abilities, the selected player's
// purchased items and the current sub-patch notes that touch them. Mechanics
// explain what a recorded ability or item does; they never supply match state.

const MAX_ITEMS = 30;
const MAX_GENERAL_NOTES = 40;
const UNKNOWN_VALUE = '(unknown value)';
const PRIMARY_ATTRIBUTES = new Map([[0, 'strength'], [1, 'agility'], [2, 'intelligence'], [3, 'universal']]);
const ATTACK_TYPES = new Map([[1, 'melee'], [2, 'ranged']]);
// Stat tokens in item value headings such as `+$armor`, read against the special
// value each one labels (`$attack` is `bonus_attack_speed`). An unlisted token is
// shown as its own words rather than guessed.
const STAT_LABELS = new Map([
  ['damage', 'Damage'], ['mana_regen', 'Mana Regeneration'], ['health', 'Health'], ['hp_regen', 'Health Regeneration'],
  ['str', 'Strength'], ['agi', 'Agility'], ['int', 'Intelligence'], ['all', 'All Attributes'], ['armor', 'Armor'],
  ['attack', 'Attack Speed'], ['mana', 'Mana'], ['move_speed', 'Movement Speed'], ['spell_resist', 'Magic Resistance'],
  ['cast_range', 'Cast Range'], ['evasion', 'Evasion'], ['spell_lifesteal', 'Spell Lifesteal'], ['lifesteal', 'Lifesteal'],
  ['cooldown_reduction', 'Cooldown Reduction'], ['attack_range', 'Attack Range'], ['status_resist', 'Status Resistance'],
  ['slow_resistance', 'Slow Resistance'], ['projectile_speed', 'Projectile Speed'], ['aoe_bonus', 'Area of Effect'],
  ['primary_attribute', 'Primary Attribute'], ['selected_attrib', 'Selected Attribute'],
]);
const HTML_ENTITIES = new Map([['&nbsp;', ' '], ['&amp;', '&'], ['&lt;', '<'], ['&gt;', '>'], ['&quot;', '"'], ['&#39;', "'"], ['&apos;', "'"]]);

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function numbers(values) {
  return Array.isArray(values) ? values.filter(finite).map(rounded) : [];
}

// A level table such as [20, 17, 14, 11]; an all-zero table means the ability has
// no such cost or cooldown, and identical levels collapse to one value.
function levelTable(values) {
  const table = numbers(values);
  if (table.length === 0 || table.every((value) => value === 0)) return [];
  return table.every((value) => value === table[0]) ? [table[0]] : table;
}

function formatLevels(values, percentage = false) {
  const table = numbers(values);
  if (table.length === 0) return null;
  const unique = table.every((value) => value === table[0]) ? [table[0]] : table;
  return unique.map((value) => `${value}${percentage ? '%' : ''}`).join(' / ');
}

export function plainText(value) {
  if (typeof value !== 'string') return '';
  let text = value.replace(/<\/h1>/gi, '. ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
  for (const [entity, replacement] of HTML_ENTITIES) text = text.replaceAll(entity, replacement);
  return text.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/\.\s*\./g, '.').trim();
}

const UPGRADE_TABLES = new Map([['scepter', 'values_scepter'], ['shard', 'values_shard']]);

// Fills `%name%` from the record's own special values as the official pages do,
// then turns `%%` into a percent sign. An Aghanim's text reads the upgrade's own
// value when the record has one, also under `%bonus_name%` and `%scepter_name%`
// or `%shard_name%`. A value the record does not carry is marked unknown instead
// of leaving template text behind.
export function resolveDescription(text, specialValues = [], variant = 'base') {
  const tables = new Map();
  const add = (name, table) => {
    if (formatLevels(table) === null) return;
    if (!tables.has(name)) tables.set(name, table);
    if (!tables.has(name.toLowerCase())) tables.set(name.toLowerCase(), table);
  };
  const upgradeKey = UPGRADE_TABLES.get(variant);
  for (const specialValue of Array.isArray(specialValues) ? specialValues : []) {
    if (typeof specialValue?.name !== 'string') continue;
    const upgrade = upgradeKey ? specialValue[upgradeKey] : null;
    if (formatLevels(upgrade) !== null) {
      for (const name of [specialValue.name, `bonus_${specialValue.name}`, `${variant}_${specialValue.name}`]) add(name, upgrade);
    }
    add(specialValue.name, specialValue.values_float);
  }
  let unresolved = 0;
  const filled = (typeof text === 'string' ? text : '').replace(/%([A-Za-z0-9_]+)%/g, (_, name) => {
    const levels = formatLevels(tables.get(name) ?? tables.get(name.toLowerCase()));
    if (levels === null) unresolved += 1;
    return levels ?? UNKNOWN_VALUE;
  }).replace(/%%/g, '%');
  return { text: plainText(filled), unresolved };
}

function statLabel(heading) {
  const cleaned = plainText(heading).replace(/:$/, '').trim();
  const token = /^([+-]?)\$([a-z_]+)$/.exec(cleaned);
  if (token) return { sign: token[1], label: STAT_LABELS.get(token[2]) ?? token[2].replaceAll('_', ' ') };
  if (!cleaned) return null;
  const words = cleaned === cleaned.toUpperCase() ? cleaned.charAt(0) + cleaned.slice(1).toLowerCase() : cleaned;
  return { sign: '', label: words.replace(/\$([a-z_]+)/g, (_, name) => STAT_LABELS.get(name) ?? name.replaceAll('_', ' ')) };
}

// The values a page lists under a heading; unlabelled values only feed descriptions.
// Aghanim's values are left to the upgrade texts, as on the official pages.
function listedValues(specialValues) {
  const rows = [];
  for (const specialValue of Array.isArray(specialValues) ? specialValues : []) {
    const heading = statLabel(specialValue?.heading_loc);
    const base = formatLevels(specialValue?.values_float, specialValue?.is_percentage === true);
    if (!heading || base === null) continue;
    rows.push({ label: heading.label, value: `${heading.sign}${base}` });
  }
  return rows;
}

function upgradeText(ability, flag, field, variant) {
  if (ability?.[flag] !== true || typeof ability?.[field] !== 'string' || !ability[field].trim()) return null;
  return resolveDescription(ability[field], ability.special_values, variant).text || null;
}

function abilityKind(ability) {
  if (ability?.ability_is_innate === true) return 'innate';
  return ability?.type === 1 ? 'ultimate' : 'basic';
}

function normalizeAbility(ability, { full }) {
  const description = resolveDescription(ability.desc_loc, ability.special_values);
  const normalized = {
    ability: { id: ability.id, name: plainText(ability.name_loc) || null },
    kind: abilityKind(ability),
    grantedBy: ability.ability_is_granted_by_scepter === true ? 'scepter' : ability.ability_is_granted_by_shard === true ? 'shard' : null,
    description: description.text || null,
    cooldowns: levelTable(ability.cooldowns),
    manaCosts: levelTable(ability.mana_costs),
    castRanges: levelTable(ability.cast_ranges),
    scepter: upgradeText(ability, 'ability_has_scepter', 'scepter_loc', 'scepter'),
    shard: upgradeText(ability, 'ability_has_shard', 'shard_loc', 'shard'),
  };
  if (full) {
    normalized.maxLevel = Number.isInteger(ability.max_level) ? ability.max_level : null;
    normalized.values = listedValues(ability.special_values);
  }
  return normalized;
}

function floorHundredths(value) {
  return Math.floor(100 * value) / 100;
}

// Talent names carry `{s:value}` for their own value and `{s:bonus_<value>}` for
// the bonus they add to an ability value, resolved as the official hero page does.
// A name that keeps an unfilled template is left unknown.
export function talentName(talent, hero) {
  let name = typeof talent?.name_loc === 'string' ? talent.name_loc : '';
  for (const specialValue of Array.isArray(talent?.special_values) ? talent.special_values : []) {
    if (typeof specialValue?.name === 'string' && finite(specialValue?.values_float?.[0])) {
      name = name.replaceAll(`{s:${specialValue.name}}`, String(floorHundredths(specialValue.values_float[0])));
    }
  }
  for (const ability of [...(hero?.abilities ?? []), ...(hero?.facet_abilities ?? []).flatMap((facet) => facet?.abilities ?? [])]) {
    for (const specialValue of Array.isArray(ability?.special_values) ? ability.special_values : []) {
      for (const bonus of Array.isArray(specialValue?.bonuses) ? specialValue.bonuses : []) {
        if (bonus?.name === talent?.name && finite(bonus?.value)) {
          name = name.replaceAll(`{s:bonus_${specialValue.name}}`, String(Math.abs(floorHundredths(bonus.value))));
        }
      }
    }
  }
  const cleaned = plainText(name);
  return cleaned && !/\{s:[^}]*\}|%[A-Za-z0-9_]+%/.test(cleaned) ? cleaned : null;
}

function heroAbilities(hero, full) {
  return (Array.isArray(hero?.abilities) ? hero.abilities : [])
    .filter((ability) => record(ability) && Number.isSafeInteger(ability.id))
    .map((ability) => normalizeAbility(ability, { full }));
}

function selectedHeroMechanics(hero) {
  const attribute = (base, gain) => ({ base: finite(hero[base]) ? rounded(hero[base]) : null, gain: finite(hero[gain]) ? rounded(hero[gain]) : null });
  const number = (field) => (finite(hero[field]) ? rounded(hero[field]) : null);
  return {
    hero: { id: hero.id, name: plainText(hero.name_loc) || null },
    primaryAttribute: PRIMARY_ATTRIBUTES.get(hero.primary_attr) ?? null,
    attackType: ATTACK_TYPES.get(hero.attack_capability) ?? null,
    attributes: {
      strength: attribute('str_base', 'str_gain'),
      agility: attribute('agi_base', 'agi_gain'),
      intelligence: attribute('int_base', 'int_gain'),
    },
    damageMin: number('damage_min'),
    damageMax: number('damage_max'),
    attackRate: number('attack_rate'),
    attackRange: number('attack_range'),
    movementSpeed: number('movement_speed'),
    armor: number('armor'),
    magicResistance: number('magic_resistance'),
    abilities: heroAbilities(hero, true),
    talents: (Array.isArray(hero.talents) ? hero.talents : [])
      .filter((talent) => record(talent) && Number.isSafeInteger(talent.id))
      .map((talent) => ({ ability: { id: talent.id, name: talentName(talent, hero) } })),
  };
}

function otherHeroMechanics(hero) {
  return {
    hero: { id: hero.id, name: plainText(hero.name_loc) || null },
    primaryAttribute: PRIMARY_ATTRIBUTES.get(hero.primary_attr) ?? null,
    attackType: ATTACK_TYPES.get(hero.attack_capability) ?? null,
    attackRange: finite(hero.attack_range) ? hero.attack_range : null,
    abilities: heroAbilities(hero, false),
  };
}

function itemMechanics(item) {
  const description = resolveDescription(item.desc_loc, item.special_values);
  return {
    item: { id: item.id, name: plainText(item.name_loc) || null },
    cost: finite(item.item_cost) ? item.item_cost : null,
    description: description.text || null,
    cooldowns: levelTable(item.cooldowns),
    manaCosts: levelTable(item.mana_costs),
    castRanges: levelTable(item.cast_ranges),
    stats: listedValues(item.special_values),
    notes: (Array.isArray(item.notes_loc) ? item.notes_loc : []).map(plainText).filter(Boolean),
  };
}

function patchNoteRows(notes) {
  return (Array.isArray(notes) ? notes : [])
    .map((note) => ({ text: plainText(note?.note), level: Number.isInteger(note?.indent_level) && note.indent_level > 0 ? note.indent_level : 1 }))
    .filter((note) => note.text);
}

function namesById(heroRecords, itemRecords) {
  const names = new Map();
  for (const hero of heroRecords) {
    for (const ability of hero.abilities ?? []) names.set(ability.id, plainText(ability.name_loc) || null);
    for (const talent of hero.talents ?? []) names.set(talent.id, talentName(talent, hero));
  }
  for (const item of itemRecords) names.set(item.id, plainText(item.name_loc) || null);
  return names;
}

function patchNotesFor(notes, { heroIds, itemIds, heroRecords, itemRecords, catalog }) {
  const names = namesById(heroRecords, itemRecords);
  const abilityRef = (id) => ({ id, name: names.get(id) ?? entityRef(catalog, 'ability', id).name });
  const general = [];
  let generalNoteCount = 0;
  let truncated = false;
  for (const section of Array.isArray(notes.general_notes) ? notes.general_notes : []) {
    const rows = patchNoteRows(section?.generic);
    if (rows.length === 0) continue;
    const room = MAX_GENERAL_NOTES - generalNoteCount;
    if (room <= 0) { truncated = true; break; }
    if (rows.length > room) truncated = true;
    general.push({ title: plainText(section?.title) || null, notes: rows.slice(0, room) });
    generalNoteCount += Math.min(rows.length, room);
  }
  const heroes = (Array.isArray(notes.heroes) ? notes.heroes : [])
    .filter((entry) => heroIds.includes(entry?.hero_id))
    .map((entry) => ({
      hero: entityRef(catalog, 'hero', entry.hero_id),
      notes: patchNoteRows(entry.hero_notes),
      talentNotes: patchNoteRows(entry.talent_notes),
      abilities: (Array.isArray(entry.abilities) ? entry.abilities : [])
        .filter((ability) => Number.isSafeInteger(ability?.ability_id))
        .map((ability) => ({ ability: abilityRef(ability.ability_id), notes: patchNoteRows(ability.ability_notes) }))
        .filter((ability) => ability.notes.length > 0),
    }))
    .filter((entry) => entry.notes.length + entry.talentNotes.length + entry.abilities.length > 0);
  const items = (Array.isArray(notes.items) ? notes.items : [])
    .filter((entry) => itemIds.includes(entry?.ability_id))
    .map((entry) => ({ item: { id: entry.ability_id, name: names.get(entry.ability_id) ?? entityRef(catalog, 'item', entry.ability_id).name }, notes: patchNoteRows(entry.ability_notes) }))
    .filter((entry) => entry.notes.length > 0);
  return { status: 'ready', version: notes.patch_number, general, generalTruncated: truncated, heroes, items };
}

// What the runtime asks the datafeed for: every hero in the match with the selected
// hero first, and the selected player's purchased items without recipes, in order
// of first purchase. A long game can hold more items than one run requests; the
// final inventory is kept first and then the most expensive purchases, because
// starting consumables and components would otherwise crowd out the finished
// items. The ones left out are named, so a review never fills them in from memory.
export function mechanicsRequest(model, { recipeItemIds = new Set(), itemCosts = new Map() } = {}) {
  const selectedHeroId = model?.player?.heroId?.value;
  const heroIds = [selectedHeroId, ...(model?.participants ?? []).map((participant) => participant?.hero?.id)]
    .filter((id, index, all) => Number.isSafeInteger(id) && id > 0 && all.indexOf(id) === index);
  const purchased = (model?.items?.purchases ?? [])
    .map((purchase) => purchase?.item?.id)
    .filter((id, index, all) => Number.isSafeInteger(id) && id > 0 && !recipeItemIds.has(id) && all.indexOf(id) === index);
  const inventory = new Set((model?.items?.finalInventory ?? []).map((item) => item?.value?.id));
  const cost = (id) => itemCosts.get(id) ?? 0;
  const kept = new Set([...purchased]
    .sort((left, right) => Number(inventory.has(right)) - Number(inventory.has(left)) || cost(right) - cost(left))
    .slice(0, MAX_ITEMS));
  return {
    selectedHeroId: Number.isSafeInteger(selectedHeroId) ? selectedHeroId : null,
    heroIds,
    itemIds: purchased.filter((id) => kept.has(id)),
    omittedItemIds: purchased.filter((id) => !kept.has(id)),
  };
}

export function recipeItemIds(itemConstants) {
  return new Set(Object.entries(itemConstants ?? {})
    .filter(([key, item]) => key.startsWith('recipe_') && Number.isSafeInteger(item?.id))
    .map(([, item]) => item.id));
}

export function itemCosts(itemConstants) {
  return new Map(Object.values(itemConstants ?? {})
    .filter((item) => Number.isSafeInteger(item?.id) && Number.isFinite(item?.cost))
    .map((item) => [item.id, item.cost]));
}

// Display names from the datafeed, keyed like entity constants, so the whole
// artifact names these heroes, abilities, talents and items the way Valve does.
export function mechanicsEntityNames(input) {
  const names = { heroes: {}, abilities: {}, items: {} };
  const ready = (rows) => (Array.isArray(rows) ? rows : []).filter((row) => row?.status === 'ready' && record(row.record));
  for (const { record: hero } of ready(input?.fetched?.heroes)) {
    const heroName = plainText(hero.name_loc);
    if (heroName) names.heroes[hero.id] = { id: hero.id, name: heroName };
    for (const ability of hero.abilities ?? []) {
      const abilityName = plainText(ability?.name_loc);
      if (Number.isSafeInteger(ability?.id) && abilityName) names.abilities[ability.id] = { id: ability.id, name: abilityName };
    }
    for (const talent of hero.talents ?? []) {
      const resolved = talentName(talent, hero);
      if (Number.isSafeInteger(talent?.id) && resolved) names.abilities[talent.id] = { id: talent.id, name: resolved };
    }
  }
  for (const { record: item } of ready(input?.fetched?.items)) {
    const itemName = plainText(item.name_loc);
    if (itemName) names.items[item.id] = { id: item.id, name: itemName };
  }
  return names;
}

export function buildMechanics(input, { catalog } = {}) {
  const unavailable = (reason) => ({
    status: 'unavailable', reason, source: null, patch: null, selectedHero: null, heroes: [], items: [], patchNotes: null, unavailable: [],
  });
  if (!input) return unavailable('not_requested');
  if (!input.fetched) return unavailable(input.reason ?? 'not_requested');
  const { fetched, request } = input;
  const failed = [];
  const readyRecords = (rows, kind) => (Array.isArray(rows) ? rows : []).filter((row) => {
    if (row?.status === 'ready' && record(row.record)) return true;
    failed.push({ kind, id: row?.id ?? null, reason: row?.error?.code ?? row?.reason ?? 'unavailable' });
    return false;
  }).map((row) => row.record);
  const heroRecords = readyRecords(fetched.heroes, 'hero');
  const itemRecords = readyRecords(fetched.items, 'item');
  for (const id of request?.omittedItemIds ?? []) failed.push({ kind: 'item', id, reason: 'item_limit' });
  const selected = heroRecords.find((hero) => hero.id === request?.selectedHeroId) ?? null;
  if (!selected) return { ...unavailable('selected_hero_unavailable'), unavailable: failed };

  const notesRow = fetched.patchNotes;
  let patchNotes = null;
  if (notesRow?.status === 'ready' && record(notesRow.record)) {
    patchNotes = patchNotesFor(notesRow.record, {
      heroIds: request.heroIds ?? [], itemIds: request.itemIds ?? [], heroRecords, itemRecords, catalog,
    });
  } else {
    failed.push({ kind: 'patch_notes', id: fetched.patch ?? null, reason: notesRow?.error?.code ?? notesRow?.reason ?? 'unavailable' });
  }
  return {
    status: failed.length === 0 ? 'ready' : 'partial',
    reason: null,
    source: 'valve_datafeed',
    patch: typeof fetched.patch === 'string' ? fetched.patch : null,
    selectedHero: selectedHeroMechanics(selected),
    heroes: heroRecords.filter((hero) => hero !== selected).map(otherHeroMechanics),
    items: itemRecords.map(itemMechanics),
    patchNotes,
    unavailable: failed,
  };
}
