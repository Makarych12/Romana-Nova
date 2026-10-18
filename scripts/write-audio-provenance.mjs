import fs from 'node:fs';
import crypto from 'node:crypto';
const meta=JSON.parse(fs.readFileSync('src/data/catalog-meta.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('src/data/audio-manifest.json','utf8'));
const record={
 name:'ROMÂNA NOVA · Romanian synthesized audio',
 language:'ro-RO',voice:'Piper / Mihai medium',
 modelUrl:'https://huggingface.co/rhasspy/piper-voices/tree/main/ro/ro_RO/mihai/medium',
 modelCard:'/licenses/ro_RO-mihai-MODEL_CARD.txt',
 modelRepositoryLicense:'MIT',trainingDatasetLicense:'CC0 (as declared in the voice MODEL_CARD)',
 important:'Training-data license does not replace source-text licenses. Audio is synthesized, not a recording of a human reader.',
 textSources:meta.url,
 textToFile:'/audio/text-to-file.json',
 textLicenses:['Original project learning examples','Russian Wiktionary excerpts: CC BY-SA 4.0','Tatoeba sentences: CC BY 2.0 FR'],
 attribution:'Individual sentence and dictionary authors, source URLs and license links are retained in the vocabulary catalog, under source / examples[].source. Audio readings of licensed excerpts retain the applicable source-text license and attribution.',
 generator:'scripts/generate-audio.py',
 pronunciationOverrides:'/audio/academy-pronunciation.json',
 sampleRate:22050,codec:'MP3',bitRate:56000,
 files:Object.keys(manifest).length,
};
fs.writeFileSync('public/audio/SOURCES.json',JSON.stringify(record,null,2)+'\n');
fs.writeFileSync('public/audio/text-to-file.json',JSON.stringify(manifest));

fs.copyFileSync('src/data/academy/pronunciation-overrides.json','public/audio/academy-pronunciation.json');
