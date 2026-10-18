import fs from 'node:fs';
import {dialogues,dialogueAudio} from '../src/data/dialogues.ts';
const origin=process.argv[2];
if(!origin){console.error('Usage: node --experimental-strip-types scripts/check-deployment.mjs https://your-site.vercel.app');process.exit(1)}
const manifest=JSON.parse(fs.readFileSync('src/data/audio-manifest.json','utf8'));
const samples=[['word','apă'],['example','Beau apă.'],['dialogue',dialogueAudio(dialogues[0])]];
const results=[];
for(const [kind,text]of samples){
 const url=new URL(manifest[text.normalize('NFC').replace(/\s+/g,' ').trim()],origin);
 try{
  const response=await fetch(url,{headers:{Range:'bytes=0-127'},signal:AbortSignal.timeout(15000)});
  const bytes=new Uint8Array(await response.arrayBuffer());
  const type=response.headers.get('content-type')||'';
  const signature=bytes.length>=3&&((bytes[0]===73&&bytes[1]===68&&bytes[2]===51)||(bytes[0]===255&&(bytes[1]&224)===224));
  results.push({kind,url:String(url),status:response.status,type,ok:[200,206].includes(response.status)&&signature&&!/html|json/.test(type)});
 }catch(error){results.push({kind,url:String(url),ok:false,error:String(error)})}
}
console.log(JSON.stringify({origin,results,scope:'HTTP delivery and MP3 signature only; use Settings → audio diagnostics to confirm audible playback.'},null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
