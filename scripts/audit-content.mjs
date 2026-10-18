import fs from "node:fs";
import crypto from "node:crypto";
import { words, lessons, railLesson } from "../src/data/course.ts";
import { dialogues, dialogueAudio } from "../src/data/dialogues.ts";
const meta = JSON.parse(fs.readFileSync("src/data/catalog-meta.json", "utf8"));
const vocabulary = JSON.parse(fs.readFileSync("public" + meta.url, "utf8"));
const manifest = JSON.parse(
  fs.readFileSync("src/data/audio-manifest.json", "utf8"),
);
const attribution = JSON.parse(
  fs.readFileSync("public/photos/attribution.json", "utf8"),
);
const norm = (t) =>
  t
    .normalize("NFC")
    .toLocaleLowerCase("ro")
    .replace(/^a\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
const normalizeAudio = (t) => t.normalize("NFC").replace(/\s+/g, " ").trim();
const assert = (value, msg) => {
  if (!value) throw Error(msg);
};
assert(vocabulary.length >= 6000, "Fewer than 6000 real entries");
assert(
  new Set(vocabulary.map((w) => norm(w.ro))).size === vocabulary.length,
  "Duplicate Romanian headwords",
);
assert(
  new Set(vocabulary.map((w) => w.id)).size === vocabulary.length,
  "Duplicate IDs",
);
for (const old of words)
  assert(
    vocabulary.find((w) => w.id === old.id)?.ro === old.ro,
    `Legacy ID changed: ${old.id}`,
  );
let photos = 0,
  examples = 0;
const photosSHA = new Set();
const coverage = (text) => {
  const url = manifest[normalizeAudio(text)];
  return (
    url &&
    fs.existsSync("public" + url) &&
    fs.statSync("public" + url).size > 500
  );
};
for (const w of vocabulary) {
  assert(
    w.ro && w.ru && w.level && w.pos && w.theme && Array.isArray(w.examples),
    `Invalid entry ${w.id}`,
  );
  assert(!/[şţ]/.test(w.ro), `Old diacritics ${w.ro}`);
  assert(coverage(w.ro), `Missing word audio: ${w.ro}`);
  if (w.quality === "reference")
    assert(
      w.source?.url && w.source?.license && w.levelEstimated === true,
      `Missing provenance ${w.id}`,
    );
  if (w.quality !== "reference")
    assert(w.examples.length >= 2, `Incomplete teaching card ${w.id}`);
  for (const e of w.examples) {
    assert(e.ro && e.ru, `Invalid example ${w.id}`);
    assert(coverage(e.ro), `Missing example audio: ${e.ro}`);
    examples++;
  }
  if (w.image) {
    assert(fs.existsSync("public" + w.image), `Missing image ${w.id}`);
    const source = w.imageSource || attribution[w.image];
    assert(
      source?.url &&
        source?.license &&
        source?.licenseUrl &&
        source?.attribution,
      `Missing photo license ${w.id}`,
    );
    const sha = crypto
      .createHash("sha256")
      .update(fs.readFileSync("public" + w.image))
      .digest("hex");
    assert(!photosSHA.has(sha), `Reused unrelated image ${w.id}`);
    photosSHA.add(sha);
    photos++;
  }
}
for (const l of [...lessons, railLesson, ...dialogues])
  for (const e of l.pairs)
    assert(coverage(e.ro), `Missing lesson audio ${l.id}: ${e.ro}`);
for (const d of dialogues)
  assert(coverage(dialogueAudio(d)), `Missing full dialogue ${d.id}`);
const baseline = JSON.parse(fs.readFileSync('quality/baseline-1.1.0/integrity.json','utf8'));
const byId=new Map(vocabulary.map(w=>[w.id,w]));
for(const [id,ro] of Object.entries(baseline.words)) assert(byId.get(id)?.ro===ro,`Preserved card changed: ${id}`);
for(const [path,old] of Object.entries(baseline.media)) {
 assert(fs.existsSync(path),`Preserved media missing: ${path}`);
 const bytes=fs.readFileSync(path);
 assert(bytes.length===old.size && crypto.createHash('sha256').update(bytes).digest('hex')===old.sha256,`Preserved media changed: ${path}`);
}
let branchAudio=0;
for(const d of dialogues) {
 assert(d.turns?.length,`No interactive scene: ${d.id}`);
 for(const turn of d.turns) {
  assert(coverage(turn.promptRo),`Missing prompt audio: ${d.id}`);
  assert(turn.options.length>=2,`Missing choices: ${d.id}`);
  for(const option of turn.options) {
   assert(coverage(option.ro),`Missing answer audio: ${d.id}`);branchAudio++;
   for(const line of option.continuation){assert(coverage(line.ro),`Missing continuation audio: ${d.id}`);branchAudio++;}
  }
 }
}
const editorial=JSON.parse(fs.readFileSync('src/data/editorial-review-notes.json','utf8'));
const quality=JSON.parse(fs.readFileSync('quality/dictionary-audit.json','utf8'));
assert(!quality.issues.some(i=>i.severity==='error'),'Unresolved structural errors; inspect quality/dictionary-audit.json');
const report = {
  total: vocabulary.length,
  added: vocabulary.length - words.length,
  photos,
  examples,
  uniqueExamples: new Set(
    vocabulary.flatMap((w) => w.examples.map((e) => e.ro)),
  ).size,
  withTwoExamples: vocabulary.filter((w) => w.examples.length >= 2).length,
  curated: vocabulary.filter((w) => w.quality !== "reference").length,
  wordAudio: vocabulary.filter((w) => coverage(w.ro)).length,
  exampleAudio: examples,
  dialogueAudio: dialogues.length,
  dialogueLines: dialogues.reduce((s, d) => s + d.pairs.length, 0),
  audioFiles: Object.keys(manifest).length,
  levels: meta.levels,
  withTwoEditoriallyReviewedExamples: meta.withTwoReviewedExamples,
  nativeSpeakerReview: false,
  baselinePhotos: 76,
  addedPhotos: photos-76,
  visuallyReviewedPhotos: meta.visuallyReviewedPhotos,
  photoVisualReviewPending: photos-meta.visuallyReviewedPhotos,
  interactiveDialogues: dialogues.filter(d=>d.turns?.length).length,
  branchAudio,
  fixedLanguageIssues: editorial.fixedIssues,
  fixedCards: editorial.fixedCards,
  structuralErrors: quality.issues.filter(i=>i.severity==='error').length,
  reviewFlags: quality.byCode,
  preservedCardIds: Object.keys(baseline.words).length,
  preservedMedia: Object.keys(baseline.media).length,
  realBrowserPlaybackVerified: false,
  physicalSoundVerified: false,
  vercelDeploymentVerified: false,
};
fs.writeFileSync("CONTENT_REPORT.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
