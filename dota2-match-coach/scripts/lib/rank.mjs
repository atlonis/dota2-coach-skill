const MEDALS = [
  [1, 'Herald'],
  [2, 'Guardian'],
  [3, 'Crusader'],
  [4, 'Archon'],
  [5, 'Legend'],
  [6, 'Ancient'],
  [7, 'Divine'],
  [8, 'Immortal'],
];

const MEDAL_BY_TIER = new Map(MEDALS);

// STRATZ отдаёт rank двузначным кодом: десятки — медаль, единицы — звезда.
// Immortal (80) не имеет звёзд. Неизвестный код не превращается в лейбл.
export function rankLabel(code) {
  if (typeof code !== 'number' || !Number.isInteger(code)) return null;
  const tier = Math.floor(code / 10);
  const star = code % 10;
  const medal = MEDAL_BY_TIER.get(tier);
  if (!medal) return null;
  if (tier === 8) return star === 0 ? medal : null;
  if (star < 0 || star > 5) return null;
  return star === 0 ? medal : `${medal} ${star}`;
}
