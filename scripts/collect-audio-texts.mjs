import { lessons, words, railLesson } from "../src/data/course.ts";
import fs from "node:fs";
import { dialogues, dialogueAudio } from "../src/data/dialogues.ts";
const texts = new Set([
  "împreună",
  "Învățăm împreună.",
  "Bună ziua! Învăț limba română.",
]);
const add = (t) => {
  if (t?.trim()) texts.add(t.normalize("NFC").replace(/\s+/g, " ").trim());
};
for (const d of dialogues) {
  add(dialogueAudio(d));
  d.pairs.forEach((p) => add(p.ro));
  for(const turn of d.turns||[]){add(turn.promptRo);for(const option of turn.options){add(option.ro);for(const line of option.continuation||[])add(line.ro);}}

}
for (const l of [...lessons, railLesson]) {
  for (const p of l.pairs) add(p.ro);
  if (l.form) add(l.form.answer);
}
for (const w of words) {
  add(w.ro);
  w.examples.forEach((ex) => add(ex.ro));
}
for (const name of ["imported-vocabulary", "curated-vocabulary"]) {
  const path = `src/data/${name}.json`;
  if (fs.existsSync(path)) {
    for (const w of JSON.parse(fs.readFileSync(path, "utf8"))) {
      add(w.ro);
      (w.examples || []).forEach((e) => add(e.ro));
    }
  }
}
const correctionFile='src/data/vocabulary-corrections.json';
if(fs.existsSync(correctionFile)){for(const patch of Object.values(JSON.parse(fs.readFileSync(correctionFile,'utf8')))){for(const ex of patch.examples||[])add(ex.ro);}}
fs.mkdirSync('/tmp/romana-tts',{recursive:true});
fs.writeFileSync(
  "/tmp/romana-tts/texts.json",
  JSON.stringify([...texts], null, 2),
);
console.log(`${texts.size} unique Romanian audio texts collected`);
