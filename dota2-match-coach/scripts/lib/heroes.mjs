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

function matchingHeroIds(heroName, heroConstants) {
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

export function resolveAccountIdByHero({ heroName, heroConstants, openDota, stratz } = {}) {
  const heroId = matchingHeroIds(heroName, heroConstants);
  const accountIds = new Set();
  const openPlayers = openDota?.status === 'ready' && Array.isArray(openDota.match?.players) ? openDota.match.players : [];
  const stratzPlayers = stratz?.status === 'ready' && Array.isArray(stratz.match?.players) ? stratz.match.players : [];

  const candidates = [
    openPlayers.filter((player) => player?.hero_id === heroId).map((player) => player?.account_id),
    stratzPlayers.filter((player) => player?.heroId === heroId).map((player) => player?.steamAccountId),
  ];

  for (const matches of candidates) {
    if (matches.length > 1) throw new HeroSelectionError('hero_ambiguous');
    if (matches.length === 1) {
      if (!positiveInteger(matches[0])) throw new HeroSelectionError('hero_account_unavailable');
      accountIds.add(matches[0]);
    }
  }

  if (accountIds.size === 0) throw new HeroSelectionError('hero_account_unavailable');
  if (accountIds.size > 1) throw new HeroSelectionError('hero_ambiguous');
  return { accountId: [...accountIds][0], heroId };
}
