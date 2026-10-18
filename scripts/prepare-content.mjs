import fs from "node:fs";
import crypto from "node:crypto";
import {auditLexicon} from "../src/lib/quality-audit.ts";
import { words as original } from "../src/data/course.ts";
export const key = (text) =>
  text
    .normalize("NFC")
    .toLocaleLowerCase("ro")
    .replace(/^a\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
const map = new Map(
  original.map((w) => [key(w.ro), { ...w, quality: "curated" }]),
);
for (const name of ["curated-vocabulary", "imported-vocabulary"]) {
  const file = `src/data/${name}.json`;
  if (!fs.existsSync(file)) continue;
  for (const word of JSON.parse(fs.readFileSync(file, "utf8"))) {
    const k = key(word.ro);
    if (!map.has(k)) map.set(k, word);
    else {
      const current = map.get(k);
      if (!current.image && word.image) current.image = word.image;
      if (current.examples.length < 2) {
        for (const ex of word.examples || []) {
          if (!current.examples.some((p) => p.ro === ex.ro))
            current.examples.push(ex);
          if (current.examples.length >= 2) break;
        }
      }
    }
  }
}
const vocabulary = [...map.values()];
const registryPath = "src/data/vocabulary-ids.json";
const registry = fs.existsSync(registryPath)
  ? JSON.parse(fs.readFileSync(registryPath, "utf8"))
  : {};
for (const w of original) registry[key(w.ro)] = w.id;
for (const w of vocabulary) {
  const k = key(w.ro);
  if (registry[k]) w.id = registry[k];
  else registry[k] = w.id;
}
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
const correctionsPath='src/data/vocabulary-corrections.json';
const corrections=fs.existsSync(correctionsPath)?JSON.parse(fs.readFileSync(correctionsPath,'utf8')):{};
const photosPath='src/data/photo-enrichment.json';
const photoEnrichment=fs.existsSync(photosPath)?JSON.parse(fs.readFileSync(photosPath,'utf8')):{};
const allowedFields=['ru','level','theme','pos','forms','examples','editorial','quality','levelEstimated'];
let patchedCards=0;
for(const word of vocabulary){
 const patch=corrections[word.id];
 if(patch){for(const field of allowedFields)if(field in patch)word[field]=patch[field];patchedCards++;}
 const photo=photoEnrichment[word.id];
 if(!word.image&&photo?.image&&photo.photoReview?.visuallyReviewed===true){
  if(!fs.existsSync('public'+photo.image)||!photo.imageSource?.license||!photo.imageSource?.attribution)throw Error('Invalid photo enrichment: '+word.id);
  word.image=photo.image;word.imageSource=photo.imageSource;word.photoReview=photo.photoReview;
 }
}
const academyPatches=JSON.parse(fs.readFileSync('src/data/academy/card-enrichment.json','utf8'));
for(const word of vocabulary){const patch=academyPatches[word.id];if(patch){const previousExamples=word.examples;for(const field of allowedFields)if(field in patch)word[field]=patch[field];word.examples=[...patch.examples,...previousExamples.filter(e=>!patch.examples.some(p=>p.ro===e.ro))];patchedCards++;}}
const editorialNotesPath='src/data/editorial-review-notes.json';
const editorialNotes=fs.existsSync(editorialNotesPath)?JSON.parse(fs.readFileSync(editorialNotesPath,'utf8')):{};
const qualityIssues=auditLexicon(vocabulary);
const flags=new Map();for(const issue of qualityIssues){const values=flags.get(issue.id)||new Set();values.add(issue.code);flags.set(issue.id,values);}
for(const word of vocabulary)word.reviewFlags=[...(flags.get(word.id)||[])];
fs.mkdirSync('quality',{recursive:true});
const qualityReport={scanned:vocabulary.length,issues:qualityIssues,byCode:Object.fromEntries([...new Set(qualityIssues.map(i=>i.code))].map(code=>[code,qualityIssues.filter(i=>i.code===code).length])),flaggedCards:new Set(qualityIssues.map(i=>i.id)).size,patchedCards,limitations:'Автоматические правила обнаруживают структурные дефекты и поводы для проверки, но не доказывают точность перевода, естественность речи или уровень CEFR.'};
fs.writeFileSync('quality/dictionary-audit.json',JSON.stringify(qualityReport,null,2)+'\n');
if (new Set(vocabulary.map((w) => w.id)).size !== vocabulary.length)
  throw Error("Duplicate IDs");
fs.mkdirSync("public/data", { recursive: true });
const body = JSON.stringify(vocabulary);
const filename = `vocabulary-${crypto.createHash("sha256").update(body).digest("hex").slice(0, 12)}.json`;
// Retain the deployed 1.1.0 catalog and recent versions for older app tabs.
const baselineMeta='quality/baseline-1.1.0/catalog-meta.json';
const pinned=fs.existsSync(baselineMeta)?JSON.parse(fs.readFileSync(baselineMeta,'utf8')).url.split('/').at(-1):'';
const recent=fs.readdirSync('public/data').filter(n=>/^vocabulary-[a-f0-9]+\.json$/.test(n)&&n!==filename).sort((a,b)=>fs.statSync('public/data/'+b).mtimeMs-fs.statSync('public/data/'+a).mtimeMs).slice(0,4);
// Older installed PWA bundles refer to their exact content hash. Keep those
// catalogs available on the host; runtime cache expiration is managed by SW.
fs.writeFileSync(`public/data/${filename}`, body);
const meta = {
  url: `/data/${filename}`,
  fallbackUrls:[...new Set([...recent,pinned].filter(n=>n&&n!==filename))].map(n=>`/data/${n}`),
  total: vocabulary.length,
  added: vocabulary.length - original.length,
  photos: vocabulary.filter((w) => w.image).length,
  examples: vocabulary.reduce((sum, w) => sum + w.examples.length, 0),
  uniqueExamples: new Set(
    vocabulary.flatMap((w) => w.examples.map((e) => e.ro)),
  ).size,
  withTwoExamples: vocabulary.filter((w) => w.examples.length >= 2).length,
  patchedCards,
  fixedLanguageIssues:editorialNotes.fixedIssues||0,
  flaggedCards:qualityReport.flaggedCards,
  withTwoReviewedExamples:vocabulary.filter(w=>w.editorial?.status==='reviewed'&&w.editorial?.examplesReviewed===true&&w.examples.length>=2).length,
  visuallyReviewedPhotos:vocabulary.filter(w=>w.image&&(!w.photoReview||w.photoReview.visuallyReviewed===true)).length,
  curated: vocabulary.filter((w) => w.quality !== "reference").length,
  levels: Object.fromEntries(
    ["A0", "A1", "A2", "B1", "B2", "C1"].map((l) => [
      l,
      vocabulary.filter((w) => w.level === l).length,
    ]),
  ),
};
fs.writeFileSync(
  "src/data/catalog-meta.json",
  JSON.stringify(meta, null, 2) + "\n",
);
fs.mkdirSync("/tmp/romana-tts", { recursive: true });
fs.writeFileSync(
  "/tmp/romana-tts/published-vocabulary.json",
  JSON.stringify(vocabulary),
);
console.log(JSON.stringify(meta, null, 2));
