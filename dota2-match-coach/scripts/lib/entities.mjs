function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstText(...values) {
  return values.map(text).find(Boolean) ?? null;
}

function records(value) {
  return value && typeof value === 'object' ? Object.entries(value) : [];
}

function put(catalog, kind, id, name, overwrite = false) {
  const numericId = Number(id);
  const cleanName = text(name);
  if (!Number.isSafeInteger(numericId) || numericId <= 0 || !cleanName) return;
  const key = String(numericId);
  if (overwrite || !catalog[kind][key]) catalog[kind][key] = cleanName;
}

export function buildEntityCatalog({
  valve = {}, heroes = {}, items = {}, abilityIds = {}, abilities = {},
} = {}) {
  const catalog = { hero: {}, item: {}, ability: {} };
  for (const [kind, source] of [['hero', valve.heroes ?? valve.hero], ['item', valve.items ?? valve.item], ['ability', valve.abilities ?? valve.ability]]) {
    for (const [key, value] of records(source)) put(catalog, kind, value?.id ?? key, firstText(value?.name, value?.localized_name, value?.localizedName, value?.dname, value?.displayName), true);
  }
  for (const [key, hero] of records(heroes)) {
    const internal = text(hero?.name);
    const fallback = internal?.replace(/^npc_dota_hero_/, '').replace(/[_-]+/g, ' ') ?? null;
    put(catalog, 'hero', hero?.id ?? key, firstText(hero?.localized_name, hero?.localizedName, fallback));
  }
  for (const [key, item] of records(items)) put(catalog, 'item', item?.id ?? key, firstText(item?.dname, item?.displayName, key));
  for (const [id, abilityKey] of records(abilityIds)) {
    const ability = abilities?.[abilityKey];
    put(catalog, 'ability', id, firstText(ability?.dname, ability?.name, abilityKey));
  }
  return catalog;
}

export function entityRef(catalog, kind, rawId) {
  const numeric = Number(rawId);
  const id = Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
  return { id, name: id == null ? null : catalog?.[kind]?.[String(id)] ?? null };
}
