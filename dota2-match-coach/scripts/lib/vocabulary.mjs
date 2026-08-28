// OpenDota gives `game_mode` and `lobby_type` as Valve numbers, STRATZ as strings
// from its own enums. These are two vocabularies for one fact, not two independent
// measurements: comparing `22` with the string `ALL_PICK_RANKED` used to declare a
// source conflict where the sources agree.
//
// The tables below are verified against both vocabularies and cover only the ranges
// where they agree: game mode 0-24 and lobby type 0-9. Beyond that the numbering
// diverges (OpenDota 25 is the coaches challenge, STRATZ holds UNKNOWN there), so a
// value outside the table is marked not comparable rather than a disagreement.

export const GAME_MODES = [
  { id: 0, stratz: 'NONE', label: 'Unknown' },
  { id: 1, stratz: 'ALL_PICK', label: 'All Pick' },
  { id: 2, stratz: 'CAPTAINS_MODE', label: 'Captains Mode' },
  { id: 3, stratz: 'RANDOM_DRAFT', label: 'Random Draft' },
  { id: 4, stratz: 'SINGLE_DRAFT', label: 'Single Draft' },
  { id: 5, stratz: 'ALL_RANDOM', label: 'All Random' },
  { id: 6, stratz: 'INTRO', label: 'Intro' },
  { id: 7, stratz: 'THE_DIRETIDE', label: 'Diretide' },
  { id: 8, stratz: 'REVERSE_CAPTAINS_MODE', label: 'Reverse Captains Mode' },
  { id: 9, stratz: 'THE_GREEVILING', label: 'Greeviling' },
  { id: 10, stratz: 'TUTORIAL', label: 'Tutorial' },
  { id: 11, stratz: 'MID_ONLY', label: 'Mid Only' },
  { id: 12, stratz: 'LEAST_PLAYED', label: 'Least Played' },
  { id: 13, stratz: 'NEW_PLAYER_POOL', label: 'Limited Heroes' },
  { id: 14, stratz: 'COMPENDIUM_MATCHMAKING', label: 'Compendium Matchmaking' },
  { id: 15, stratz: 'CUSTOM', label: 'Custom' },
  { id: 16, stratz: 'CAPTAINS_DRAFT', label: 'Captains Draft' },
  { id: 17, stratz: 'BALANCED_DRAFT', label: 'Balanced Draft' },
  { id: 18, stratz: 'ABILITY_DRAFT', label: 'Ability Draft' },
  { id: 19, stratz: 'EVENT', label: 'Event' },
  { id: 20, stratz: 'ALL_RANDOM_DEATH_MATCH', label: 'All Random Deathmatch' },
  { id: 21, stratz: 'SOLO_MID', label: '1v1 Mid' },
  // Valve calls this mode `all_draft`, STRATZ calls it `ALL_PICK_RANKED`; the player
  // knows it as Ranked All Pick. Whether it is ranked is set by the lobby type.
  { id: 22, stratz: 'ALL_PICK_RANKED', label: 'All Draft' },
  { id: 23, stratz: 'TURBO', label: 'Turbo' },
  { id: 24, stratz: 'MUTATION', label: 'Mutation' },
];

export const LOBBY_TYPES = [
  { id: 0, stratz: 'UNRANKED', label: 'Unranked' },
  { id: 1, stratz: 'PRACTICE', label: 'Practice' },
  { id: 2, stratz: 'TOURNAMENT', label: 'Tournament' },
  { id: 3, stratz: 'TUTORIAL', label: 'Tutorial' },
  { id: 4, stratz: 'COOP_VS_BOTS', label: 'Co-op vs Bots' },
  { id: 5, stratz: 'TEAM_MATCH', label: 'Ranked Team MM' },
  { id: 6, stratz: 'SOLO_QUEUE', label: 'Ranked Solo MM' },
  { id: 7, stratz: 'RANKED', label: 'Ranked' },
  { id: 8, stratz: 'SOLO_MID', label: '1v1 Mid' },
  { id: 9, stratz: 'BATTLE_CUP', label: 'Battle Cup' },
];

function entryForOpenDota(table, value) {
  return Number.isInteger(value) ? table.find((entry) => entry.id === value) ?? null : null;
}

function entryForStratz(table, value) {
  return typeof value === 'string' ? table.find((entry) => entry.stratz === value.toUpperCase()) ?? null : null;
}

// Returns the field in the same shape as the model's other sourced fields, plus a
// `label`. Three outcomes instead of two: agreement, a real disagreement, and a
// vocabulary that cannot be compared.
export function resolveVocabularyField(label, table, { opendota, stratz } = {}) {
  const warnings = [];
  const candidates = [
    { source: 'opendota', raw: opendota, entry: entryForOpenDota(table, opendota) },
    { source: 'stratz', raw: stratz, entry: entryForStratz(table, stratz) },
  ].filter((candidate) => candidate.raw != null);

  if (candidates.length === 0) return { field: { value: null, label: null, source: null }, warnings };

  for (const candidate of candidates.filter((entry) => !entry.entry)) {
    warnings.push(`${label} value from ${candidate.source} is outside the known vocabulary.`);
  }

  const known = candidates.filter((candidate) => candidate.entry);
  const asCandidates = (rows) => rows.map(({ raw, source }) => ({ value: raw, source }));
  if (known.length === 0) {
    return { field: { value: null, label: null, source: null, candidates: asCandidates(candidates) }, warnings };
  }
  if (new Set(known.map((candidate) => candidate.entry.id)).size > 1) {
    warnings.push(`${label} conflict between ${known.map((candidate) => candidate.source).join(' and ')}.`);
    return { field: { value: null, label: null, source: null, candidates: asCandidates(known) }, warnings };
  }
  const [first] = known;
  return { field: { value: first.entry.id, label: first.entry.label, source: first.source }, warnings };
}
