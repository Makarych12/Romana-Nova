import {useEffect,useRef,useState} from 'react';
import {Mic} from 'lucide-react';
import {stopAudio} from '../lib/audio';
export default function VoiceRecorder({notify}:{notify:(s:string)=>void}){
 const [state,setState]=useState<'idle'|'pending'|'recording'>('idle');const [url,setUrl]=useState('');
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),audioURL=useRef(''),owner=useRef(0);
 useEffect(()=>()=>{owner.current++;if(recorder.current){recorder.current.onstop=null;recorder.current.ondataavailable=null;if(recorder.current.state!=='inactive')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());if(audioURL.current)URL.revokeObjectURL(audioURL.current);},[]);
 async function start(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){notify('Запись недоступна. Используйте текстовый режим.');return;}
  const token=++owner.current;setState('pending');stopAudio();let acquired:MediaStream|null=null;
  try{acquired=await navigator.mediaDevices.getUserMedia({audio:true});if(token!==owner.current){acquired.getTracks().forEach(t=>t.stop());return;}
   stream.current=acquired;const chunks:Blob[]=[];const r=new MediaRecorder(acquired);recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=()=>{acquired?.getTracks().forEach(t=>t.stop());if(token!==owner.current)return;if(audioURL.current)URL.revokeObjectURL(audioURL.current);audioURL.current=URL.createObjectURL(new Blob(chunks,{type:r.mimeType}));setUrl(audioURL.current);setState('idle');};
   r.onerror=()=>{acquired?.getTracks().forEach(t=>t.stop());if(token===owner.current){setState('idle');notify('Ошибка записи. Попробуйте ещё раз или введите текст.');}};
   r.start();setState('recording');
  }catch{acquired?.getTracks().forEach(t=>t.stop());if(token===owner.current){setState('idle');notify('Нет доступа к микрофону. Ответ можно ввести текстом.');}}
 }
 return <section className="panel recorder"><Mic size={26}/><div><h3>Послушайте себя</h3><p>Запись хранится в памяти до закрытия раздела. Сравните её с эталоном на слух.</p></div><button className="secondary" disabled={state==='pending'} onClick={()=>state==='recording'?recorder.current?.stop():start()}>{state==='recording'?'Остановить запись':state==='pending'?'Ожидаем микрофон…':'Записать голос'}</button>{url&&<audio src={url} controls onPlay={()=>stopAudio()}/>}</section>;
}
