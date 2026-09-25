// Turns YouTube auto-caption VTT into plain text with a timestamp every ~30 seconds.
// Auto captions roll: each cue repeats the previous line and adds the next one, so a
// line is kept only when it differs from the line emitted before it.
//
// Usage: node vtt-to-text.mjs <transcripts-dir>
// Writes <id>.txt next to every <id>.<lang>.vtt in that directory.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PARAGRAPH_SECONDS = 30;

function seconds(stamp) {
  const [h, m, s] = stamp.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function clock(total) {
  const whole = Math.floor(total);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function vttToText(vtt) {
  const lines = [];
  let start = null;
  for (const raw of vtt.split(/\r?\n/)) {
    const cue = /^(\d+:\d+:\d+\.\d+) --> /.exec(raw);
    if (cue) { start = seconds(cue[1]); continue; }
    if (start === null || raw.trim() === '' || /^(WEBVTT|Kind:|Language:)/.test(raw)) continue;
    const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (text && text !== lines.at(-1)?.text) lines.push({ start, text });
  }
  const paragraphs = [];
  for (const line of lines) {
    const last = paragraphs.at(-1);
    if (last && line.start - last.start < PARAGRAPH_SECONDS) last.text.push(line.text);
    else paragraphs.push({ start: line.start, text: [line.text] });
  }
  return paragraphs.map((paragraph) => `[${clock(paragraph.start)}] ${paragraph.text.join(' ')}`).join('\n') + '\n';
}

const dir = process.argv[2];
for (const name of (await readdir(dir)).filter((file) => file.endsWith('.vtt'))) {
  const id = name.split('.')[0];
  await writeFile(path.join(dir, `${id}.txt`), vttToText(await readFile(path.join(dir, name), 'utf8')));
}
