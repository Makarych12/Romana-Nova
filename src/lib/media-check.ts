import {resolveAudioFile} from './audio-index';
export type MediaCheck={label:string;url:string;ok:boolean;status?:number;contentType?:string;error?:string};
export async function checkAudioDelivery(label:string,text:string,signal?:AbortSignal):Promise<MediaCheck>{
 const url=await resolveAudioFile(text);if(!url)return {label,url:'',ok:false,error:'Нет записи в локальном аудиоманифесте.'};
 const controller=new AbortController();
 const abort=()=>controller.abort();
 const timer=setTimeout(abort,15000);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 try{
  const response=await fetch(url,{headers:{Range:'bytes=0-127'},cache:'no-store',signal:controller.signal});
  const type=response.headers.get('Content-Type')||'';const bytes=new Uint8Array(await response.arrayBuffer());
  const mp3=bytes.length>=3&&((bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0));
  if(![200,206].includes(response.status)||!mp3||/text\/html|application\/json/.test(type))return {label,url,ok:false,status:response.status,contentType:type,error:`HTTP ${response.status}, Content-Type: ${type||'не указан'} — ответ не является MP3: ${url}. Проверьте файл и правила перенаправления хостинга.`};
  return {label,url,ok:true,status:response.status,contentType:type};
 }catch(error){return {label,url,ok:false,error:controller.signal.aborted?`Проверка отменена или не завершилась за 15 секунд: ${url}`:error instanceof Error?error.message:'Не удалось получить файл.'}}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
