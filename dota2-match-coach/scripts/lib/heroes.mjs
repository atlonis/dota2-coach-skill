export class HeroSelectionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'HeroSelectionError';
    this.code = code;
  }
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizedName(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/^npc_dota_hero_/, '')
    .replace(/[^a-z0-9]+/g, '');
}

function heroRecords(heroConstants) {
  if (Array.isArray(heroConstants)) return heroConstants;
  if (heroConstants && typeof heroConstants === 'object') return Object.values(heroConstants);
  return [];
}

// The hero ID for an exact English hero name or internal hero name.
export function heroIdForName(heroName, heroConstants) {
  const requested = normalizedName(heroName);
  if (!requested) throw new HeroSelectionError('hero_not_found');
  const ids = new Set();
  for (const hero of heroRecords(heroConstants)) {
    if (!hero || typeof hero !== 'object') continue;
    const names = [hero.name, hero.localized_name, hero.localizedName].map(normalizedName);
    if (names.includes(requested) && positiveInteger(hero.id)) ids.add(hero.id);
  }
  if (ids.size === 0) throw new HeroSelectionError('hero_not_found');
  if (ids.size > 1) throw new HeroSelectionError('hero_ambiguous');
  return [...ids][0];
}
