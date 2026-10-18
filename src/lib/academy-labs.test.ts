import {describe,it,expect} from 'vitest';
import {grammarTasks,verbs,verbForms,tenseNames} from '../data/academy/grammar';
import {listeningTasks,voiceScenarios} from '../data/academy/listening';
import {dialogues} from '../data/dialogues';
import {compareSpeech} from './speech-comparison';
import {fresh,recordAnswer,validateProgress} from './store';
describe('Academy laboratories',()=>{
 it('has at least 500 distinct listening tasks with transcripts and all six mechanisms',()=>{
  expect(listeningTasks.length).toBeGreaterThanOrEqual(500);
  expect(new Set(listeningTasks.map(t=>t.id)).size).toBe(listeningTasks.length);
  expect(new Set(listeningTasks.map(t=>t.mechanic)).size).toBe(6);
  const spelling=listeningTasks.find(t=>t.mechanic==='Аудио → текст')!;expect(spelling.answer).toBe(spelling.audio);
  const meaning=listeningTasks.find(t=>t.mechanic==='Значение')!;expect(meaning.answer).toMatch(/[А-Яа-я]/);expect(meaning.answer).not.toBe(meaning.audio);
  for(const task of listeningTasks){expect(task.audio).toBe(task.transcript);expect(task.wordId).toBeTruthy();expect(task.why).toMatch(/[А-Яа-я]/);if(task.options){expect(task.options).toContain(task.answer);expect(task.options.length).toBeGreaterThan(1);}}
 });
 it('keeps voice answers tied to actual speakers and full dialogue branches',()=>{
  expect(voiceScenarios.length).toBeGreaterThan(250);
  for(const s of voiceScenarios){const d=dialogues.find(d=>d.id===s.dialogueId)!;expect(d).toBeTruthy();expect(d.pairs.some(p=>p.ro===s.targetRo&&p.ru===s.targetRu)).toBe(true);expect(s.role).toBeTruthy();}
 });
 it('covers six-person paradigms and contextual grammar without duplicate IDs',()=>{
  expect(grammarTasks.length).toBeGreaterThanOrEqual(1000);
  expect(new Set(grammarTasks.map(t=>t.id)).size).toBe(grammarTasks.length);
  for(const v of verbs)for(const tense of tenseNames){expect(verbForms(v,tense)).toHaveLength(6);expect(verbForms(v,tense).every(Boolean)).toBe(true);}
  expect(verbForms(verbs.find(v=>v.infinitive==='fi')!,'Conjunctiv prezent')).toEqual(['să fiu','să fii','să fie','să fim','să fiți','să fie']);
  expect(verbForms(verbs.find(v=>v.infinitive==='face')!,'Perfect compus')[2]).toBe('a făcut');
  for(const l of ['A0','A1','A2','B1','B2','C1'])expect(grammarTasks.some(t=>t.level===l)).toBe(true);
 });
 it('aligns insertions and omissions while preserving Romanian diacritics',()=>{
  const result=compareSpeech('Eu beau apă.','Eu beau multă apă');expect(result.reference.every(t=>t.match)).toBe(true);expect(result.spoken[2]).toEqual({text:'multă',match:false});expect(result.exact).toBe(false);
  expect(compareSpeech('Învăț română.','invat romana').exact).toBe(false);
  expect(compareSpeech('Bună ziua!',' BUNĂ  ZIUA ').exact).toBe(true);
  expect(compareSpeech('Ana are o carte.','Ana are carte').reference[2].match).toBe(false);
 });
 it('round-trips lab mistakes through the same SRS and profile schema',()=>{
  for(const e of [grammarTasks[0],listeningTasks[0]]){const p=validateProgress(JSON.parse(JSON.stringify(recordAnswer(fresh(),e,false))));expect(p.mistakes[e.id]).toEqual(e);expect(p.reviews[e.wordId!].due).toBeGreaterThan(Date.now());expect(recordAnswer(p,e,true).mistakes[e.id]).toBeUndefined();}
 });
});

describe('Content boundaries',()=>{
 it('stores dialogue variants separately from authored situation families',()=>{
  const added=dialogues.filter(d=>d.familyId);expect(added).toHaveLength(340);expect(new Set(added.map(d=>d.familyId)).size).toBe(34);
  for(const d of added){expect(d.audioMode).toBe('sequence');expect(d.pairs).toHaveLength(6);expect(d.questions?.length).toBeGreaterThan(0);for(const q of d.questions!){expect(q.options).toContain(q.answer);expect(d.pairs.some(p=>p.ro===q.audio)).toBe(true);}}
 });
 it('restores whole dialogue replies rather than splitting them into individual words',()=>{
  const tasks=listeningTasks.filter(t=>t.mechanic==='Порядок реплик');expect(tasks).toHaveLength(dialogues.length);
  for(const t of tasks){expect(t.buildUnits).toHaveLength(3);expect(t.buildUnits!.join(' ')).toBe(t.answer);}
 });
});
