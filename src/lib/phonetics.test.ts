import {describe,it,expect} from 'vitest';
import {alphabet,phoneticLessons,phoneticTasks,phoneticModes,stressWords,readingRoute} from '../data/academy/phonetics';
import {recordAnswer,validateProgress,fresh} from './store';
import {isCorrect} from './exercises';
describe('Romanian pronunciation academy',()=>{
 it('has all 31 letters in Romanian order, comma diacritics and unique IDs',()=>{
  expect(alphabet.map(l=>l.lower).join('')).toBe('aăâbcdefghiîjklmnopqrsștțuvwxyz');
  expect(new Set(phoneticTasks.map(t=>t.id)).size).toBe(phoneticTasks.length);
  expect(phoneticLessons.length).toBeGreaterThanOrEqual(14);
  expect(phoneticTasks.filter(t=>['stress','sound','contrast','letter'].includes(t.mode)).length).toBeGreaterThanOrEqual(150);
  for(const l of alphabet){expect(l.upper).toBe(l.lower.toLocaleUpperCase('ro'));expect(l.examples.length).toBeGreaterThanOrEqual(2);}
 });
 it('covers all 12 real modes, audio and seven reading stages',()=>{
  expect(readingRoute).toHaveLength(7);
  for(const [mode]of phoneticModes)expect(phoneticTasks.some(t=>t.mode===mode)).toBe(true);
  for(const task of phoneticTasks){expect(task.audio).toBeTruthy();expect(task.wordId).toBeTruthy();if(task.options){expect(task.options).toContain(task.answer);expect(new Set(task.options).size).toBe(task.options.length);expect(task.options.length).toBeGreaterThan(1);}}
 });
 it('only marks dictionary-verified stress and keeps spelling untouched',()=>{
  expect(stressWords.length).toBeGreaterThan(50);
  for(const w of stressWords){expect(w.syllables.join('')).toBe(w.word);expect(w.source).toMatch(/^https:\/\/doom\.lingv\.ro\/cautare/);expect(w.stress).toBeGreaterThanOrEqual(0);expect(w.stress).toBeLessThan(w.syllables.length);const start=w.syllables.slice(0,w.stress).join('').length;expect(w.stressOffset).toBeGreaterThanOrEqual(start);expect(w.stressOffset).toBeLessThan(start+w.syllables[w.stress].length);}
  const coffee=stressWords.find(w=>w.word==='cafea')!,plural=stressWords.find(w=>w.word==='cafele')!;
  expect(coffee.stressOffset).toBe(4);expect(plural.stressOffset).toBe(3);
 });
 it('persists mistakes and SRS through existing profile without touching old IDs',()=>{
  const before=fresh();before.favorites=['v-0'];before.reviews['v-0']={due:100,interval:3,reps:2};
  const task=phoneticTasks[0];const wrong=recordAnswer(before,task,false);const restored=validateProgress(JSON.parse(JSON.stringify(wrong)));
  expect(restored.mistakes[task.id]).toEqual(task);expect(restored.reviews[task.wordId!].interval).toBe(0);expect(restored.reviews['v-0']).toEqual(before.reviews['v-0']);expect(restored.favorites).toEqual(before.favorites);
  const corrected=recordAnswer(restored,task,true);expect(corrected.mistakes[task.id]).toBeUndefined();expect(corrected.reviews[task.wordId!].reps).toBe(1);
  expect(isCorrect('tara','țară')).toBe(false);expect(isCorrect('ȘASE','șase')).toBe(true);
 });
});
