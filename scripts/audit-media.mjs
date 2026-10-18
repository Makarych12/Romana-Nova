import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lessons, railLesson } from '../src/data/course.ts';
import { dialogues, dialogueAudio } from '../src/data/dialogues.ts';
import { audioKey, audioLookupPrefix, normalizeAudioText } from '../src/lib/audio-text.ts';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const meta = read('src/data/catalog-meta.json');
const cards = read('public' + meta.url);
const manifest = read('src/data/audio-manifest.json');
const norm = text => text.normalize('NFC').replace(/\s+/g, ' ').trim();
const missing = text => !manifest[norm(text)] || !fs.existsSync('public' + manifest[norm(text)]);
const errors = [];
const indexMeta = read('src/data/audio-index-meta.json');
const chunks = new Map();
for (const [text, url] of Object.entries(manifest)) {
  const prefix = audioLookupPrefix(text);
  if (!chunks.has(prefix)) chunks.set(prefix, read('public' + indexMeta.baseUrl + '/' + prefix + '.json'));
  const chunk = chunks.get(prefix);
  if (chunk['=' + audioKey(text)] !== url || (chunk[normalizeAudioText(text)] && chunk[normalizeAudioText(text)] !== url)) errors.push({ text, error: 'incorrect audio lookup' });
}
const report = {
  date: '2026-10-18',
  catalog: meta.url,
  manifestSHA256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
  cards: cards.length,
  wordFiles: cards.filter(w => !missing(w.ro)).length,
  examples: cards.flatMap(w => w.examples).length,
  exampleFiles: cards.flatMap(w => w.examples).filter(e => !missing(e.ro)).length,
  linkedPhotos: cards.filter(w => w.image).length,
  cardsWithFewerThanTwoExamples: cards.filter(w => w.examples.length < 2).length,
  uniqueMP3: new Set(Object.values(manifest)).size,
  audioIndexRevision: indexMeta.revision,
  audioIndexShards: chunks.size,
  maxAudioIndexShardBytes: indexMeta.maxShardBytes,
  originalMediaFilesChecked: 0,
  decodedAllMP3: false,
  browserPlaybackVerified: false,
  physicalSoundVerified: false,
  mobileRenderingVerified: false,
};
for (const [text, url] of Object.entries(manifest)) {
  if (!fs.existsSync('public' + url)) { errors.push({ text, url, error: 'missing file' }); continue; }
  const buffer = fs.readFileSync('public' + url);
  if (!(buffer.subarray(0, 3).toString() === 'ID3' || buffer[0] === 255 && (buffer[1] & 224) === 224))
    errors.push({ text, url, error: 'invalid MP3 signature' });
}
for (const w of cards) {
  if (missing(w.ro)) errors.push({ id: w.id, error: 'missing word MP3' });
  for (const e of w.examples) if (missing(e.ro)) errors.push({ id: w.id, text: e.ro, error: 'missing example MP3' });
  if (w.image && !fs.existsSync('public' + w.image)) errors.push({ id: w.id, error: 'missing photo' });
}
for (const l of [...lessons, railLesson, ...dialogues]) {
  for (const p of l.pairs) if (missing(p.ro)) errors.push({ lesson: l.id, text: p.ro });
  if (l.form && missing(l.form.answer)) errors.push({ lesson: l.id, text: l.form.answer });
}
for (const d of dialogues) {
  const texts = [dialogueAudio(d), ...(d.turns || []).flatMap(t => [t.promptRo, ...t.options.flatMap(o => [o.ro, ...o.continuation.map(c => c.ro)])])];
  for (const text of texts) if (missing(text)) errors.push({ dialogue: d.id, text });
}
const baseline = read('quality/baseline-1.1.0/integrity.json');
const byId = new Map(cards.map(w => [w.id, w.ro]));
report.preservedCardIds = Object.entries(baseline.words).filter(([id, ro]) => byId.get(id) === ro).length;
if (report.preservedCardIds !== 7984) errors.push({ error: 'card IDs or headwords changed' });
// Audit every original MP3 and photo from the first Git commit, not just the
// smaller content baseline. Git's blob hash also verifies the exact bytes.
const original = spawnSync('git', ['ls-tree', '-r', 'f0362d1', 'public/audio', 'public/photos'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
if (original.status === 0) {
  for (const line of original.stdout.trim().split('\n')) {
    const match = /^\d+ blob ([a-f0-9]+)\t(.+\.(?:mp3|webp|jpg|png))$/.exec(line);
    if (!match) continue;
    const [, expected, file] = match;
    if (!fs.existsSync(file)) { errors.push({ file, error: 'original media deleted' }); continue; }
    const bytes = fs.readFileSync(file);
    const actual = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (actual !== expected) errors.push({ file, error: 'original media modified' });
    report.originalMediaFilesChecked++;
  }
}
if (process.argv.includes('--decode')) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'romana-decode-'));
  try {
    const files = [...new Set(Object.values(manifest))];
    const list = path.join(temporary, 'files.txt');
    fs.writeFileSync(list, files.map(url => `file '${path.resolve('public' + url).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    const decoded = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-xerror', '-f', 'concat', '-safe', '0', '-i', list, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    report.decodedAllMP3 = decoded.status === 0;
    if (!report.decodedAllMP3) errors.push({ error: 'ffmpeg decode failed', details: decoded.stderr || decoded.error?.message });
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
report.errors = errors;
fs.mkdirSync('quality', { recursive: true });
fs.writeFileSync('quality/media-audio-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
