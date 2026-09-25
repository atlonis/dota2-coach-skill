// Rewrites the index table in ../README.md from ../videos.json and the notes present.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const videos = JSON.parse(await readFile(path.join(root, 'videos.json'), 'utf8'));
const notes = new Set(await readdir(path.join(root, 'notes')));
const kinds = { review: 'review', macro: 'macro', micro: 'micro and laning', role: 'role' };

const rows = videos.map((video) => {
  const note = `${String(video.n).padStart(2, '0')}-${video.id}.md`;
  const title = video.title.replace(/\|/g, '/').replace(/[[\]]/g, '');
  const date = `${video.date.slice(0, 4)}-${video.date.slice(4, 6)}`;
  const status = notes.has(note) ? `[note](notes/${note})` : 'pending';
  return `| ${video.n} | [${title}](https://youtu.be/${video.id}) | ${video.channel} | ${date} | ${video.patchAtPublication} | ${video.lang.toUpperCase()} | ${kinds[video.cat]} | ${status} |`;
});
const table = ['| # | Video | Channel | Published | Patch | Lang | Kind | Note |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');

const readmePath = path.join(root, 'README.md');
const readme = await readFile(readmePath, 'utf8');
await writeFile(readmePath, readme.replace(/<!-- index:start -->[\s\S]*<!-- index:end -->/, `<!-- index:start -->\n${table}\n<!-- index:end -->`));
