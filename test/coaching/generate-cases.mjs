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
