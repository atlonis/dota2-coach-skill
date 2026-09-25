// Checks every note against ../videos.json and prints the counts used in ../SYNTHESIS.md.
// Exits with status 1 when a header or a signal line does not match the note format.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const videos = JSON.parse(await readFile(path.join(root, 'videos.json'), 'utf8'));
const files = await readdir(path.join(root, 'notes'));
const CATEGORIES = ['observable', 'partly observable', 'derivable', 'not observable'];
const LANGUAGES = { ru: 'Russian', en: 'English' };

// Data the runtime collects or could read but does not publish, matched in derivable and partly
// observable signal lines. These are keyword counts: a line can match several groups.
const GAPS = [
  ['all players\' positions', /position rows?|positions|distance/],
  ['lane versus neutral last hits', /events\.cs|isNeutral|neutral (kills|last hits)|[Ll]ane versus neutral/],
  ['teleports', /events\.repositions|[Tt]eleport/],
  ['teamfight intervals', /teamfight/],
  ['rune pickups', /events\.runes|[Rr]une pickups/],
  ['kill times', /events\.kills|[Kk]ill times|collected kill/],
  ['other players\' per-minute data', /only in the sources|in the sources but not published|for every player|for all players/],
  ['stacks', /camps_stacked|[Ss]tacks/],
];

const problems = [];
const categories = Object.fromEntries(CATEGORIES.map((name) => [name, 0]));
const stages = {};
const gaps = Object.fromEntries(GAPS.map(([name]) => [name, new Set()]));
let findings = 0;

for (const video of videos) {
  const prefix = `${String(video.n).padStart(2, '0')}-${video.id}.md`;
  if (!files.includes(prefix)) {
    problems.push(`${video.n}: note ${prefix} is missing`);
    continue;
  }
  const text = await readFile(path.join(root, 'notes', prefix), 'utf8');
  const header = text.match(/^- \*\*Video:\*\* .*$/m)?.[0] ?? '';
  const date = `${video.date.slice(0, 4)}-${video.date.slice(4, 6)}-${video.date.slice(6)}`;
  const expected = [`youtu.be/${video.id}`, ` · ${video.channel} · `, ` · ${date} · `, ` · ${video.minutes} min · `, LANGUAGES[video.lang]];
  for (const part of expected) if (!header.includes(part)) problems.push(`${video.n}: header lacks "${part.trim()}"`);
  if (!text.includes(`**Patch at publication:** ${video.patchAtPublication}`)) problems.push(`${video.n}: patch is not ${video.patchAtPublication}`);

  for (const block of text.split(/^### /m).slice(1)) {
    findings += 1;
    const title = block.split('\n')[0];
    const stage = title.split(' · ')[2] ?? 'unknown';
    stages[stage] = (stages[stage] ?? 0) + 1;
    const signal = block.match(/^\*\*Signal — ([a-z ]+)\.\*\* (.*)$/m);
    if (!signal || !CATEGORIES.includes(signal[1])) {
      problems.push(`${video.n}: "${title}" has no valid signal line`);
      continue;
    }
    categories[signal[1]] += 1;
    if (signal[1] === 'derivable' || signal[1] === 'partly observable') {
      for (const [name, pattern] of GAPS) if (pattern.test(signal[2])) gaps[name].add(video.n);
    }
  }
}

const share = (count) => `${count} (${Math.round((count / findings) * 100)}%)`;
console.log(`notes: ${files.length}, findings: ${findings}`);
for (const name of CATEGORIES) console.log(`  ${name}: ${share(categories[name])}`);
console.log('stages:');
for (const [name, count] of Object.entries(stages).sort((a, b) => b[1] - a[1])) console.log(`  ${name}: ${count}`);
console.log('unpublished data named by derivable or partly observable signals, in videos:');
for (const [name, set] of Object.entries(gaps).sort((a, b) => b[1].size - a[1].size)) console.log(`  ${name}: ${set.size}`);
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
