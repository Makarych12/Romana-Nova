import {useState} from 'react';
import {ArrowRight} from 'lucide-react';
import type {PageProps} from '../App';
import {phoneticTasks,phoneticModes} from '../data/academy/phonetics';
import {grammarTasks} from '../data/academy/grammar';
import {listeningTasks} from '../data/academy/listening';
import {lexicalTasks,correctionTasks} from '../data/academy/workshop';
import {railExercises} from '../data/academy/railway';
import {lessons} from '../data/course';
import {shuffle,type Exercise} from '../lib/exercises';
export const workshopModes=[
 ...phoneticModes.map(([id,title])=>({id,title,tasks:phoneticTasks.filter(t=>t.mode===id)})),
 {id:'listening-meaning',title:'Аудио → перевод',tasks:listeningTasks.filter(t=>t.mechanic==='Значение')},
 {id:'listening-gap',title:'Заполни пропуск по записи',tasks:listeningTasks.filter(t=>t.mechanic==='Пропуск')},
 {id:'listening-order',title:'Восстанови порядок реплик',tasks:listeningTasks.filter(t=>t.mechanic==='Порядок реплик')},
 {id:'listening-question',title:'Вопрос по услышанному',tasks:listeningTasks.filter(t=>t.mechanic==='Вопрос по услышанному')},
 {id:'conjugate',title:'Проспрягай глагол',tasks:grammarTasks.filter(t=>t.mechanic==='Спряжение')},
 {id:'tense',title:'Различай времена',tasks:grammarTasks.filter(t=>t.mechanic==='Определи время')},
 {id:'grammar-gap',title:'Грамматическая форма',tasks:grammarTasks.filter(t=>t.mechanic==='Заполни пропуск')},
 {id:'correct',title:'Исправь ошибку',tasks:correctionTasks},
 {id:'synonym',title:'Найди близкое значение',tasks:lexicalTasks.filter(t=>t.id.startsWith('academy:synonym:'))},
 {id:'antonym',title:'Найди противоположное значение',tasks:lexicalTasks.filter(t=>t.id.startsWith('academy:antonym:'))},
 {id:'technical',title:'Технический перевод',tasks:railExercises},
 {id:'exam',title:'Комплексная проверка',tasks:[...phoneticTasks.filter(t=>t.mode==='stress'),...listeningTasks.slice(0,30),...grammarTasks.filter(t=>t.mechanic!=='Спряжение'),...correctionTasks]},
] satisfies {id:string;title:string;tasks:Exercise[]}[];
export default function AcademyWorkshop({progress,openLesson}:PageProps){
 const [mode,setMode]=useState(workshopModes[0].id);const selected=workshopModes.find(m=>m.id===mode)!;
 function start(due=false){const pool=due?selected.tasks.filter(t=>!progress.reviews[t.wordId!]||progress.reviews[t.wordId!].due<=Date.now()):selected.tasks;if(pool.length)openLesson({...lessons[0],id:`academy:workshop:${mode}`,title:selected.title},'mixed',shuffle(pool).slice(0,20).map(e=>({...e,options:e.options?shuffle(e.options):undefined})));}
 return <section className="panel phonetic-rule"><h2>Мастерская тренировок · {workshopModes.length} режимов</h2><p>Слух, чтение, речь, формы, смысл и профессиональная лексика. Результаты связаны с существующим SRS. Словарные режимы с фотографиями доступны в словаре.</p><div className="button-row"><select aria-label="Режим мастерской" value={mode} onChange={e=>setMode(e.target.value)}>{workshopModes.map(m=><option key={m.id} value={m.id}>{m.title} · {m.tasks.length}</option>)}</select><button className="primary" onClick={()=>start()}>Начать <ArrowRight size={18}/></button><button className="secondary" disabled={!selected.tasks.some(t=>!progress.reviews[t.wordId!]||progress.reviews[t.wordId!].due<=Date.now())} onClick={()=>start(true)}>По сроку SRS</button></div><p className="muted">Комплексная проверка сохраняет ответы и ошибки, но не заменяет экзамен уровня CEFR.</p></section>;
}
