// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import LessonPlayer from './LessonPlayer';
import {lessons} from '../data/course';
vi.mock('./AudioControls',()=>({AudioBar:()=>null}));
vi.mock('../lib/audio',()=>({speak:vi.fn(),stopAudio:vi.fn()}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('does not let a late recognition callback answer the next exercise',()=>{
 class Recognition{static last:Recognition;lang='';onresult=(_e:unknown)=>{};onerror=()=>{};onend=()=>{};stop=vi.fn();start=()=>{};constructor(){Recognition.last=this;}}
 vi.stubGlobal('SpeechRecognition',Recognition);const answer=vi.fn();
 render(<LessonPlayer lesson={lessons[0]} mode="speech" custom={[{id:'speech-a',kind:'speech',prompt:'Первая реплика',answer:'Bună',audio:'Bună',why:'Привет',skill:'speaking'},{id:'speech-b',kind:'speech',prompt:'Вторая реплика',answer:'Mulțumesc',audio:'Mulțumesc',why:'Спасибо',skill:'speaking'}]} speed={1} onClose={vi.fn()} onAnswer={answer} onComplete={vi.fn()} notify={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Произнести фразу'}));const stale=Recognition.last.onresult;
 fireEvent.change(screen.getByRole('textbox',{name:'Ваш ответ'}),{target:{value:'Bună'}});fireEvent.click(screen.getByRole('button',{name:'Проверить'}));expect(answer).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Следующее задание'}));stale({results:[[{transcript:'Bună'}]]});
 expect((screen.getByRole('textbox',{name:'Ваш ответ'})as HTMLInputElement).value).toBe('');expect(answer).toHaveBeenCalledTimes(1);expect(Recognition.last.stop).toHaveBeenCalled();
});
