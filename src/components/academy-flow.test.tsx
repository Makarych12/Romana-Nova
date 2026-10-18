// @vitest-environment jsdom
import {useState} from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import PhoneticsAcademy from '../pages/PhoneticsAcademy';
import AcademyLabs from '../pages/AcademyLabs';
import VoiceRecorder from './VoiceRecorder';
import type {PageProps} from '../App';
import {fresh} from '../lib/store';
const audio=vi.hoisted(()=>({speak:vi.fn().mockResolvedValue(true),sequence:vi.fn().mockResolvedValue(undefined),stop:vi.fn(),state:{status:'idle',text:''}}));
vi.mock('../lib/audio',()=>({speak:audio.speak,speakSequence:audio.sequence,stopAudio:audio.stop,stopAudioIfSession:vi.fn(),audioSessionId:()=>0,subscribeAudio:()=>()=>{},getAudioState:()=>audio.state}));
const props=(page:PageProps['page']='phonetics'):PageProps=>({page,progress:fresh(),update:vi.fn(),openLesson:vi.fn(),openConversation:vi.fn(),notify:vi.fn()});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
describe('Academy interaction and resource ownership',()=>{
 it('routes letter, word and slow playback through the existing engine API',()=>{
  render(<PhoneticsAcademy {...props()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Название буквы Ș'}));expect(audio.speak).toHaveBeenLastCalledWith('șe',1,expect.any(Function));
  fireEvent.click(screen.getByRole('checkbox',{name:/Медленно/}));fireEvent.click(screen.getByRole('button',{name:'Название буквы Ă'}));expect(audio.speak).toHaveBeenLastCalledWith('ă',.75,expect.any(Function));
  fireEvent.click(screen.getByRole('tab',{name:'Ударение'}));fireEvent.click(screen.getByRole('button',{name:'Послушать cafea'}));expect(audio.speak).toHaveBeenLastCalledWith('cafea',.75,expect.any(Function));
 });
 it('reads separate fragments via the ended-driven queue, never a timer',()=>{
  render(<PhoneticsAcademy {...props()}/>);fireEvent.click(screen.getByRole('tab',{name:'Курс чтения'}));fireEvent.click(screen.getByRole('button',{name:'5. Предложения'}));fireEvent.click(screen.getByRole('button',{name:/Последовательно/}));
  expect(audio.sequence).toHaveBeenLastCalledWith(['Eu','beau','apă.'],1,expect.any(Function));expect(audio.speak).not.toHaveBeenCalled();
 });
 it('launches real tasks for each phonetic mode with persistent exercise IDs',()=>{
  const p=props();render(<PhoneticsAcademy {...p}/>);fireEvent.click(screen.getByRole('tab',{name:'12 тренажёров'}));fireEvent.click(screen.getByRole('button',{name:/Собери слово из букв/}));
  const tasks=vi.mocked(p.openLesson).mock.calls[0][2]!;expect(tasks.length).toBeGreaterThan(0);expect(tasks.every(t=>t.characterBuild&&t.audio&&t.id.startsWith('phon:build:'))).toBe(true);
 });
 it('supports typed voice responses and records differences as text, not accent scores',()=>{
  const updates=vi.fn();function Harness(){const[p,setP]=useState(fresh());return <AcademyLabs {...props('voice')} progress={p} update={fn=>{setP(x=>{const next=fn(x);updates(next);return next;});}}/>;}
  render(<Harness/>);fireEvent.change(screen.getByRole('textbox',{name:'Ваш ответ'}),{target:{value:'un răspuns diferit'}});fireEvent.click(screen.getByRole('button',{name:'Сравнить текст'}));expect(screen.getByText('Есть расхождения с учебным образцом')).toBeTruthy();
  const saved=updates.mock.calls.at(-1)![0];expect(saved.attempts).toBe(1);expect(Object.keys(saved.mistakes)[0]).toMatch(/^academy:voice:/);expect(Object.keys(saved.reviews)[0]).toMatch(/^academy:dialogue:/);
 });
 it('releases a microphone granted after the recorder was unmounted',async()=>{
  let grant!:(s:MediaStream)=>void;const stop=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(resolve=>{grant=resolve;})}});vi.stubGlobal('MediaRecorder',vi.fn());
  const view=render(<VoiceRecorder notify={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Записать голос'}));view.unmount();grant({getTracks:()=>[{stop}]} as unknown as MediaStream);await waitFor(()=>expect(stop).toHaveBeenCalledTimes(1));
 });
});
