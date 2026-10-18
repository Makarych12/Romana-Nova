import AudioPlaybackCheck from "../components/AudioPlaybackCheck";
import playbackCases from "../data/academy/playback-check.json";
import {useState,useSyncExternalStore} from 'react';
import {Volume2,ArrowRight,RotateCcw,BookOpen} from 'lucide-react';
import type {PageProps} from '../App';
import {alphabet,phoneticLessons,phoneticModes,phoneticTasks,readingRoute,stressWords,phoneticSources,type PhoneticMode} from '../data/academy/phonetics';
import {speak,speakSequence,getAudioState,subscribeAudio} from '../lib/audio';
import {shuffle,type Exercise} from '../lib/exercises';
import type {Lesson} from '../data/course';
export const phoneticsLesson:Lesson={id:'academy-phonetics',level:'A0',title:'Фонетическая лаборатория',subtitle:'Буквы · звуки · чтение',minutes:12,rule:'Слушайте образец, отвечайте и возвращайтесь к ошибкам.',tip:'Распознавание текста не оценивает акцент.',pairs:[]};
export default function PhoneticsAcademy({progress,openLesson,notify}:PageProps){
 const [tab,setTab]=useState('alphabet');
 const [selected,setSelected]=useState(phoneticLessons[0].id);
 const [route,setRoute]=useState(0);
 const playback=useSyncExternalStore(subscribeAudio,getAudioState);
 const [slow,setSlow]=useState(false);
 const rate=slow?.75:progress.speed;
 const play=(text:string)=>speak(text,rate,notify);
 const lesson=phoneticLessons.find(l=>l.id===selected)!;
 const mistakes=Object.values(progress.mistakes).filter(e=>e.id.startsWith('phon:'));
 function launch(mode:PhoneticMode,custom?:Exercise[]){
  const pool=custom||phoneticTasks.filter(e=>e.mode===mode);
  if(pool.length)openLesson({...phoneticsLesson,title:phoneticModes.find(m=>m[0]===mode)?.[1]||'Повторение ошибок'},'mixed',shuffle(pool).slice(0,20).map(e=>({...e,options:e.options?shuffle(e.options):undefined})));
 }
 const step=readingRoute[route];
 return <div className="page-content phonetics-academy">
  <div className="page-heading"><span className="eyebrow">A0 → A1 · ФУНДАМЕНТ РУМЫНСКОГО</span><h1>Алфавит и произношение</h1><p>31 буква, {phoneticLessons.length} уроков и {phoneticTasks.length} заданий. Сначала слушайте, затем читайте и проверяйте себя.</p></div>
  <div className="button-row phonetics-toolbar"><label><input type="checkbox" checked={slow} onChange={e=>setSlow(e.target.checked)}/> Медленно · 0,75×</label><button className="secondary" disabled={!mistakes.length} onClick={()=>launch('dictation',mistakes)}><RotateCcw size={17}/>Повторить ошибки · {mistakes.length}</button></div>
  <div className="level-tabs academy-tabs" role="tablist" aria-label="Разделы фонетики">{[['alphabet','31 буква'],['rules','Правила чтения'],['stress','Ударение'],['reading','Курс чтения'],['lab','12 тренажёров']].map(([id,title])=><button role="tab" aria-selected={tab===id} className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{title}</button>)}</div>
  {tab==='alphabet'&&<><p className="muted">Название буквы и звук в слове различаются. Международные обозначения /…/ описывают звук; русские пояснения служат опорой.</p><div className="alphabet-grid">{alphabet.map(l=><article className="panel letter-card" key={l.lower}>
   <div className="letter-heading"><strong lang="ro">{l.upper} <span>{l.lower}</span></strong><button className="icon-btn" aria-label={`Название буквы ${l.upper}`} onClick={()=>play(l.nameAudio)}><Volume2 size={21}/></button></div>
   <p><b lang="ro">{l.name}</b> · <span>{l.ipa}</span></p><p>{l.explanation}</p>
   {l.examples.map(e=><button className="letter-example" key={e.ro} onClick={()=>play(e.ro)}><Volume2 size={15}/><span lang="ro">{e.ro}</span><small>{e.ru}</small></button>)}
  </article>)}</div><button className="primary" onClick={()=>launch('letter')}>Тренировать буквы <ArrowRight size={18}/></button></>}
  {tab==='rules'&&<><div className="rule-links">{phoneticLessons.map(l=><button className={selected===l.id?'text-tag active':'text-tag'} key={l.id} onClick={()=>setSelected(l.id)}>{l.title}</button>)}</div><article className="panel phonetic-rule"><BookOpen size={27}/><h2>{lesson.title}</h2><p>{lesson.explanation}</p><div className="tip"><p>{lesson.tip}</p></div><div className="example-list">{lesson.examples.map(e=><div key={e.ro}><div><strong lang="ro">{e.ro}</strong><span>{e.ru}</span></div><button className="icon-btn" aria-label={`Послушать ${e.ro}`} onClick={()=>play(e.ro)}><Volume2 size={19}/></button></div>)}</div><button className="primary" onClick={()=>{const pool=phoneticTasks.filter(t=>t.lessonId===lesson.id);launch('sound',pool.length?pool:phoneticTasks.filter(t=>t.mode==='error'));}}>Проверить чтение <ArrowRight size={18}/></button></article></>}
  {tab==='stress'&&<><article className="panel phonetic-rule"><h2>Слышать ударный слог</h2><p>Ударение выделяет слог силой, длительностью и движением тона. В румынском оно свободное: последняя буква не определяет его место. Безударные гласные сохраняют своё качество.</p><p>Слушайте слово, считайте слоги, затем сверяйте словарную разметку. При изменении формы ударение может сместиться: ca-FEA → ca-FE-le. В незнакомом слове откройте DOOM³, не угадывайте по похожему окончанию.</p><p>В нормативном тексте ударение не дописываем. Ниже выделен слог в отдельной учебной строке. Проверено {stressWords.length} словарных форм; автоматической расстановки нет.</p><button className="primary" onClick={()=>launch('stress')}>Тренировать ударение <ArrowRight size={18}/></button></article><div className="stress-grid">{stressWords.map(w=><article className="panel stress-card" key={w.word}><div className="button-row"><strong lang="ro">{w.word}</strong><button className="icon-btn" aria-label={`Послушать ${w.word}`} onClick={()=>play(w.word)}><Volume2 size={18}/></button></div><p>{w.ru}</p><div className="stress-syllables" lang="ro" aria-label={`Ударный слог ${w.stress+1}`}>{w.syllables.map((s,i)=><span key={i}>{i>0?' · ':''}{i===w.stress?<mark>{s}</mark>:s}</span>)}</div><button className="text-tag" onClick={()=>speakSequence(w.syllables,rate,notify)}>По слогам</button><a className="muted" href={w.source} target="_blank" rel="noreferrer">DOOM³ · источник</a></article>)}</div></>}
  {tab==='reading'&&<><div className="reading-route">{readingRoute.map((r,i)=><button className={route===i?'text-tag active':'text-tag'} onClick={()=>setRoute(i)} key={r.id}>{i+1}. {r.title}</button>)}</div><article className="panel phonetic-rule"><h2>{route+1}. {step.title}</h2><p>{step.explanation}</p><div className="reading-fragments" lang="ro">{step.fragments.map((text,i)=><button key={i} className={playback.status==='playing'&&playback.text===text?'active':''} onClick={()=>play(text)}>{text}</button>)}</div><div className="button-row"><button className="audio-pill" onClick={()=>speakSequence([...step.fragments],rate,notify)}><Volume2 size={20}/>Последовательно · {rate}×</button>{step.id==='sentences'&&<button className="audio-pill" onClick={()=>play(step.fragments.join(' '))}>Целая фраза</button>}<button className="primary" onClick={()=>launch(step.mode)}>Тренировка <ArrowRight size={18}/></button></div><p className="muted">Подсветка показывает только играющий отдельный фрагмент. Для текста целиком временные метки не придуманы.</p></article></>}
  {tab==='lab'&&<><p>Первые 20 заданий выбранного типа в случайном порядке. Ответы сохраняются в общем прогрессе и SRS; ошибки доступны для повторения. У речи проверяется только распознанный текст. Можно отвечать письменно.</p><div className="practice-modes">{phoneticModes.map(([mode,title])=><button key={mode} className="mode-card" onClick={()=>launch(mode)}><strong>{title}</strong><span>{phoneticTasks.filter(e=>e.mode===mode).length} заданий</span><ArrowRight size={18}/></button>)}</div></>}
  <AudioPlaybackCheck speed={rate} notify={notify} samples={playbackCases} title="Проверка MP3 академии: буквы, правила и новые режимы"/>
  <details className="panel phonetic-rule"><summary>Источники и границы проверки</summary><p>Пояснения адаптированы для русскоязычного ученика. Аудио — румынский синтез Piper/Mihai, а не запись носителя. Изолированные слоги и названия иностранных букв требуют особенно внимательной слуховой проверки. Варианты ударения показаны только для подтверждённых словарных форм.</p>{phoneticSources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></p>)}</details>
 </div>;
}
