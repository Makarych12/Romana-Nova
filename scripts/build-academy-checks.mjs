import fs from 'node:fs';
import {alphabet,phoneticLessons,phoneticModes,phoneticTasks} from '../src/data/academy/phonetics.ts';
import {listeningTasks} from '../src/data/academy/listening.ts';
import {verbs,tenseNames,verbForms} from '../src/data/academy/grammar.ts';
import {railUnits} from '../src/data/academy/railway.ts';
import {dialogues} from '../src/data/dialogues.ts';
const manifest=JSON.parse(fs.readFileSync('src/data/audio-manifest.json'));const rows=[];
const add=(kind,text)=>rows.push({kind,text});
add('original-cafea','cafea');alphabet.forEach(l=>add('alphabet:'+l.upper,l.nameAudio));
phoneticLessons.forEach(l=>add('phonetic-rule:'+l.id,l.examples[0].ro));
phoneticModes.forEach(([mode])=>add('phonetic-mode:'+mode,phoneticTasks.find(t=>t.mode===mode).audio));
[...new Set(listeningTasks.map(t=>t.mechanic))].forEach(m=>add('listening:'+m,listeningTasks.find(t=>t.mechanic===m).audio));
add('listening:monologue',listeningTasks.find(t=>t.id.includes(':monologue:')).audio);
tenseNames.forEach(t=>add('grammar:'+t,verbForms(verbs[0],t)[0]));
railUnits.forEach(g=>add('railway:'+g.id,g.terms[0].ro));
[...new Set(dialogues.filter(d=>d.familyId).map(d=>d.familyId))].forEach(f=>add('dialogue-family:'+f,dialogues.find(d=>d.familyId===f).pairs[1].ro));
const map=new Map();for(const row of rows){const old=map.get(row.text);if(old)old.kind+=';'+row.kind;else map.set(row.text,{id:'academy-playback:'+map.size,...row,url:manifest[row.text]});}
const cases=[...map.values()];if(cases.some(c=>!c.url))throw Error('Academy playback check has missing MP3');
fs.writeFileSync('src/data/academy/playback-check.json',JSON.stringify(cases,null,2)+'\n');console.log(cases.length+' distinct real MP3 cases covering all letters and new modes');
