import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fullMatchFixture } from '../../dota2-match-coach/scripts/test/fixtures.mjs';
import { normalizeEvidence } from '../../dota2-match-coach/scripts/lib/normalize.mjs';
import { projectArtifact, renderEvidenceMarkdown } from '../../dota2-match-coach/scripts/lib/report.mjs';
import { buildProgress } from '../../dota2-match-coach/scripts/lib/progress.mjs';
import { fullWeeksWithin } from '../../dota2-match-coach/scripts/lib/baseline.mjs';

// Synthetic fixtures only. These files exercise the agent's final review, not a live API.
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node test/coaching/generate-cases.mjs <output-directory>');

function matchedFixture() {
  const input = fullMatchFixture();
  input.stratz.match.gameMode = 'ALL_PICK_RANKED';
  input.baseline.bracket = 'LEGEND_ANCIENT';
  input.baseline.bracketSource = 'player_medal';
  input.baseline.rankCode = 52;
  input.baseline.weeks = fullWeeksWithin(input.openDota.match.start_time - 21 * 86400, input.openDota.match.start_time);
  return input;
}

const MINUTES = Array.from({ length: 31 }, (_, minute) => minute);

// Parsed-match context: recorded sample times, team economy and objectives.
function withMatchContext(input, goldBySelectedSideMinute) {
  const players = input.openDota.match.players;
  for (const player of players) player.times = MINUTES.map((minute) => minute * 60);
  Object.assign(input.openDota.match, {
    radiant_gold_adv: MINUTES.map(goldBySelectedSideMinute),
    radiant_xp_adv: MINUTES.map((minute) => Math.round(goldBySelectedSideMinute(minute) * 1.2)),
    objectives: [],
  });
  return input;
}

// Synthetic datafeed records. Their numbers deliberately differ from the live game,
// so an answer quoting live values reveals reliance on memory.
function mechanicsFixture() {
  const hero = {
    id: 90, name_loc: 'Keeper of the Light', primary_attr: 2, attack_capability: 2, attack_range: 600,
    abilities: [{
      id: 5478, name_loc: 'Illuminate', type: 0, max_level: 4, cooldowns: [11], mana_costs: [140], cast_ranges: [1750],
      desc_loc: 'Channels a wave of light that deals up to %total_damage% damage to enemies in its path.',
      special_values: [{ name: 'total_damage', values_float: [95, 170, 245, 320], heading_loc: 'MAX DAMAGE:', values_shard: [], values_scepter: [] }],
    }],
    talents: [],
  };
  const forceStaff = {
    id: 102, name_loc: 'Force Staff', item_cost: 2150, cooldowns: [21], mana_costs: [95], cast_ranges: [575],
    desc_loc: '<h1>Active: Force</h1> Pushes the target unit %push_length% units in the direction it is facing.',
    notes_loc: ['Does not interrupt the target\'s actions.'],
    special_values: [
      { name: 'push_length', values_float: [575], heading_loc: '', values_shard: [], values_scepter: [] },
      { name: 'bonus_health', values_float: [165], heading_loc: '+$health', values_shard: [], values_scepter: [] },
      { name: 'bonus_intellect', values_float: [11], heading_loc: '+$int', values_shard: [], values_scepter: [] },
    ],
  };
  return {
    request: { selectedHeroId: 90, heroIds: [90], itemIds: [102] },
    fetched: {
      status: 'ready', patch: 'test-current-subpatch',
      heroes: [{ kind: 'hero', id: 90, status: 'ready', record: hero }],
      items: [{ kind: 'item', id: 102, status: 'ready', record: forceStaff }],
      patchNotes: {
        kind: 'patchNotes', id: 'test-current-subpatch', status: 'ready',
        record: { patch_number: 'test-current-subpatch', heroes: [], items: [{ ability_id: 102, ability_notes: [{ indent_level: 1, note: 'Push distance decreased from 600 to 575' }] }], success: true },
      },
    },
  };
}

const cases = [
  {
    name: 'full-review',
    prompt: 'Это мой матч. Разбери его полностью и выбери одну задачу для следующей игры.',
    change: () => {},
  },
  {
    name: 'focused-items',
    prompt: 'Это мой матч. Кратко оцени только мои предметы: что можно установить по покупкам и использованию Force Staff?',
    change: () => {},
  },
  {
    name: 'zero-deaths',
    prompt: 'Это мой матч. Дай краткий разбор и одно упражнение на следующую игру.',
    change(input) {
      input.openDota.match.players[0].deaths = 0;
      input.stratz.match.players[0].deaths = 0;
      input.stratz.match.players[0].playbackData.deathEvents = [];
    },
  },
  {
    name: 'rank-mismatch',
    prompt: 'Это мой матч. Сравни мой фарм с доступной выборкой и предложи упражнение.',
    change(input) {
      input.baseline.bracket = 'DIVINE_IMMORTAL';
      input.baseline.rankCode = 72;
      input.baseline.bracketSource = 'match_average';
    },
  },
  {
    name: 'missing-playback',
    prompt: 'Это мой матч. Почему я умирал? Дай краткий разбор.',
    change(input) {
      input.stratz = { status: 'unavailable', reason: 'missing_token' };
      input.baseline = { status: 'unavailable', reason: 'missing_token' };
    },
  },
  {
    name: 'unknown-item',
    prompt: 'Разбери только предметы игрока на Keeper of the Light в этом матче.',
    change(input) {
      input.openDota.match.players[0].purchase_log = [{ time: 300, item_id: 999999 }];
      input.openDota.match.players[0].item_0 = 999999;
      input.stratz.match.players[0].item0Id = 999999;
      input.stratz.match.players[0].playbackData.itemUsedEvents = [{ time: 598, itemId: 999999 }];
    },
  },
  {
    name: 'lane-focus-with-deaths',
    prompt: 'Это мой матч. Разбери только добивания на линии к 10-й минуте и дай упражнение по этому аспекту.',
    change(input) {
      input.openDota.match.players[0].lh_t = Array.from({ length: 31 }, (_, minute) => minute * 2);
    },
  },
  {
    name: 'turning-point',
    prompt: 'Это мой матч. Где игра перевернулась и почему? Кратко, с одной задачей на следующую игру.',
    change(input) {
      const lead = (minute) => (minute <= 14 ? minute * 250 : minute <= 19 ? 3500 - (minute - 14) * 1220 : -2600 - (minute - 19) * 300);
      withMatchContext(input, lead);
      input.openDota.match.objectives = [
        { time: 965, type: 'building_kill', unit: 'npc_dota_hero_6', key: 'npc_dota_goodguys_tower1_bot', player_slot: 128 },
        { time: 1060, type: 'CHAT_MESSAGE_ROSHAN_KILL', team: 3 },
        { time: 1061, type: 'CHAT_MESSAGE_AEGIS', player_slot: 129 },
        { time: 1110, type: 'building_kill', unit: 'npc_dota_creep_badguys_melee', key: 'npc_dota_goodguys_tower2_bot' },
      ];
    },
  },
  {
    name: 'item-mechanics',
    prompt: 'Это мой матч. Коротко: что делает мой Force Staff в этом патче и что видно о том, как я его использовал?',
    change(input) {
      input.mechanics = mechanicsFixture();
    },
  },
  {
    name: 'support-wards',
    prompt: 'Это мой матч, я играл саппорта. Кратко: как я ставил варды и что проверить в следующей игре?',
    change(input) {
      withMatchContext(input, (minute) => minute * 100);
      input.openDota.match.players.forEach((player, index) => {
        player.obs_log = index === 0 ? [{ time: -30, ehandle: 1 }, { time: 250, ehandle: 2 }, { time: 700, ehandle: 3 }, { time: 1350, ehandle: 4 }] : index < 5 ? [{ time: 400, ehandle: 10 + index }] : [{ time: 300, ehandle: 20 + index }, { time: 900, ehandle: 30 + index }];
        player.obs_left_log = index === 0 ? [{ time: 330, ehandle: 1 }, { time: 610, ehandle: 2 }, { time: 760, ehandle: 3 }] : [];
        player.sen_log = index === 0 ? [{ time: 480, ehandle: 5 }] : [];
        player.sen_left_log = index === 0 ? [{ time: 900, ehandle: 5 }] : [];
        player.buyback_log = [];
      });
    },
  },
  {
    name: 'personal-progress',
    prompt: 'Это мой матч. Сравни мои добивания к 10-й минуте с предыдущими играми: помогла ли моя тренировка? Дай краткий ответ и одну задачу.',
    change: () => {},
    prepare(model) {
      const priors = [3, 4].map((slope, index) => {
        const input = matchedFixture();
        input.matchId -= index + 1;
        input.openDota.match.start_time -= (index + 1) * 3600;
        input.stratz.match.startDateTime = input.openDota.match.start_time;
        input.openDota.match.players[0].lh_t = Array.from({ length: 31 }, (_, minute) => minute * slope);
        return projectArtifact(normalizeEvidence(input));
      });
      model.progress = buildProgress(model, priors);
      model.progress.historyLoad = { status: 'ready', reason: null, skippedFileCount: 0, truncated: false };
    },
  },
];

await mkdir(destination, { recursive: true });
for (const scenario of cases) {
  const input = matchedFixture();
  scenario.change(input);
  const model = normalizeEvidence(input);
  scenario.prepare?.(model);
  const artifact = projectArtifact(model);
  const directory = path.join(destination, scenario.name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'evidence.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(path.join(directory, 'evidence.md'), renderEvidenceMarkdown(artifact));
  await writeFile(path.join(directory, 'request.md'), [
    'Use the dota2-match-coach skill to answer the user request below.',
    'This is an offline evaluation. The runtime has already supplied evidence.json and evidence.md in this directory; use them instead of calling the runtime or fetching live data.',
    'The evidence is synthetic; do not verify its fictional patch or match externally. Return the actual player-facing answer, not an evaluation or a plan.',
    '', scenario.prompt, '',
  ].join('\n'));
}
console.log(`Generated ${cases.length} offline coaching cases in ${path.resolve(destination)}`);
