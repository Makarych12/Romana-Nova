import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {alphabet,phoneticLessons,phoneticTasks,stressWords,readingRoute,phoneticAudioTexts} from '../src/data/academy/phonetics.ts';
import {listeningTasks,voiceScenarios,listeningAudioTexts} from '../src/data/academy/listening.ts';
import {grammarTasks,verbs,grammarAudioTexts} from '../src/data/academy/grammar.ts';
import {railTerms,railExercises,railAudioTexts} from '../src/data/academy/railway.ts';
import {lexicalTasks,correctionTasks,workshopAudioTexts} from '../src/data/academy/workshop.ts';
import {lessons} from '../src/data/course.ts';
import {dialogues} from '../src/data/dialogues.ts';
const base='a4cad20';
const oldMeta=JSON.parse(execFileSync('git',['show',base+':src/data/catalog-meta.json'],{encoding:'utf8'}));
const oldWords=JSON.parse(fs.readFileSync('public'+oldMeta.url));
const meta=JSON.parse(fs.readFileSync('src/data/catalog-meta.json'));
const words=JSON.parse(fs.readFileSync('public'+meta.url));
const manifest=JSON.parse(fs.readFileSync('src/data/audio-manifest.json'));
const oldManifest=JSON.parse(execFileSync('git',['show',base+':src/data/audio-manifest.json'],{encoding:'utf8',maxBuffer:8e6}));
const cardPatches=JSON.parse(fs.readFileSync('src/data/academy/card-enrichment.json'));
const sources=JSON.parse(fs.readFileSync('quality/stress-source-verification.json'));
const byId=new Map(words.map(w=>[w.id,w]));const errors=[];
for(const w of oldWords){const current=byId.get(w.id);if(current?.ro!==w.ro)errors.push('Old ID/headword changed: '+w.id);for(const ex of w.examples)if(!current?.examples.some(p=>p.ro===ex.ro&&p.ru===ex.ru))errors.push('Old example lost: '+w.id+':'+ex.ro);}
for(const [text,url]of Object.entries(oldManifest))if(manifest[text]!==url)errors.push('Old MP3 mapping changed: '+text);
const changedOldMp3=execFileSync('git',['diff',base,'--name-only','--diff-filter=MD','--','public/audio/*.mp3'],{encoding:'utf8'}).trim();
if(changedOldMp3)errors.push('Changed old MP3: '+changedOldMp3);
const engineFiles=['src/lib/audio.ts','src/lib/audio-index.ts','src/lib/audio-tts.ts','src/lib/audio-cache.ts'];
const engine=engineFiles.map(file=>{const before=execFileSync('git',['show',base+':'+file]);const after=fs.readFileSync(file);const unchanged=before.equals(after);if(!unchanged)errors.push('Audio engine changed: '+file);return{file,unchanged,sha256:crypto.createHash('sha256').update(after).digest('hex')};});
const texts=[...new Set([...phoneticAudioTexts(),...listeningAudioTexts(),...grammarAudioTexts(),...railAudioTexts(),...workshopAudioTexts(),...dialogues.flatMap(d=>d.pairs.map(p=>p.ro)),...Object.values(cardPatches).flatMap(p=>p.examples.map(e=>e.ro))])];
for(const text of texts){const key=text.normalize('NFC').replace(/\s+/g,' ').trim();const url=manifest[key];if(!url||!fs.existsSync('public'+url)||fs.statSync('public'+url).size<500)errors.push('Missing academy MP3: '+text);}
const exercises=[...phoneticTasks,...listeningTasks,...grammarTasks,...railExercises,...lexicalTasks,...correctionTasks];
const ids=new Set();for(const e of exercises){if(ids.has(e.id))errors.push('Duplicate exercise ID: '+e.id);ids.add(e.id);if(e.options&&(!e.options.includes(e.answer)||new Set(e.options).size!==e.options.length))errors.push('Invalid options: '+e.id);if(!e.wordId)errors.push('No SRS link: '+e.id);if(e.buildUnits&&e.buildUnits.join(' ')!==e.answer)errors.push('Invalid reply ordering: '+e.id);}
for(const [id,patch]of Object.entries(cardPatches)){const word=byId.get(id);if(!word?.image||word.examples.length<2||!word.forms)errors.push('Incomplete enriched teaching card: '+id);}
for(const d of dialogues){if(!d.questions?.length)errors.push('No dialogue comprehension: '+d.id);for(const q of d.questions||[])if(!q.options.includes(q.answer)||!manifest[q.audio])errors.push('Invalid dialogue comprehension: '+d.id);}
const added=dialogues.filter(d=>d.familyId);
const expanded=JSON.parse(fs.readFileSync("quality/academy-dialogue-materials.json"));
if(JSON.stringify(added)!==JSON.stringify(expanded))errors.push("Compact dialogue content differs from reviewed expanded materials");
const report={date:'2026-10-18',baselineCommit:base,errors,
 preserved:{cardIds:oldWords.length,headwords:oldWords.length,examples:oldWords.reduce((sum,w)=>sum+w.examples.length,0),oldMp3Mappings:Object.keys(oldManifest).length,oldMp3FilesUnmodified:!changedOldMp3,audioEngine:engine,profileDatabase:'romana-nova, version 1; no reset, no migration'},
 vocabulary:{total:words.length,newCardIds:words.length-oldWords.length,enrichedExistingCards:Object.keys(cardPatches).length,photos:meta.photos,addedPhotos:meta.photos-oldMeta.photos,examples:meta.examples,addedExamples:meta.examples-oldMeta.examples,withTwoExamples:meta.withTwoExamples,stillWithFewerThanTwoExamples:words.filter(w=>w.examples.length<2).length},
 phonetics:{letters:alphabet.length,lessons:phoneticLessons.length,readingStages:readingRoute.length,tasks:phoneticTasks.length,readingTasks:phoneticTasks.filter(t=>['syllable','build','error','sentence'].includes(t.mode)).length,stressTasks:phoneticTasks.filter(t=>t.mode==='stress').length,soundAndStressTasks:phoneticTasks.filter(t=>['stress','sound','contrast','letter'].includes(t.mode)).length,verifiedStressForms:stressWords.length,unverifiedFormsExcluded:sources.filter(r=>r.error).map(r=>r.word),modes:12,syllableTiming:'sequential separate MP3; highlight only playing fragment, no timer alignment',Q:'explicit /ky/ synthesis instead of default /kju/; new clip only; not physically heard by agent'},
 learning:{lessons:lessons.length,newLessons:lessons.length-16,byLevel:Object.fromEntries(['A0','A1','A2','B1','B2','C1'].map(l=>[l,lessons.filter(x=>x.level===l).length])),listeningTasks:listeningTasks.length,listeningMechanics:[...new Set(listeningTasks.map(t=>t.mechanic))],voiceRoleResponses:voiceScenarios.length,dialogues:dialogues.length,newDialogues:added.length,newDialogueFamilies:new Set(added.map(d=>d.familyId)).size,variantsPerNewFamily:10,grammarTasks:grammarTasks.length,verbParadigmTasks:grammarTasks.filter(t=>t.mechanic==='Спряжение').length,contextualGrammarTasks:grammarTasks.filter(t=>t.mechanic!=='Спряжение').length,verbs:verbs.length,railTerms:railTerms.length,railExercises:railExercises.length,lexicalTasks:lexicalTasks.length,correctionTasks:correctionTasks.length,workshopModes:24},
 audio:{totalMp3:Object.keys(manifest).length,newMp3:Object.keys(manifest).length-Object.keys(oldManifest).length,academyTextsChecked:texts.length,allMappedToLocalMp3:!errors.some(e=>e.startsWith('Missing academy MP3')),librariesInstalled:[]},
 verification:{staticContentAudit:true,realBrowserAvailable:false,realBrowserPlaybackVerified:false,agentPhysicallyHeardNewAudio:false,newPhotoRenderingInRealBrowserVerified:false,userPreviouslyConfirmedCafea:true},
 remaining:['A2–C1 now have four modules each, not an exhaustive CEFR course.','New dialogue count includes 340 controlled variants of 34 authored situations, not 340 unrelated themes.','Professional term target 2000 not reached; current bank has 120.','Thousands of reference cards still lack two reviewed examples.','Independent native-speaker and railway-specialist editorial review is not complete.','New phonetic recordings, microphone recognition, mobile layout and offline PWA need real-device checks.']};
fs.writeFileSync('quality/academy-expansion-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,preserved:{...report.preserved,audioEngine:engine.map(x=>({file:x.file,unchanged:x.unchanged}))}},null,2));if(errors.length)process.exitCode=1;
