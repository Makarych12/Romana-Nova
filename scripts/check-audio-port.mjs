/** HTTP/artifact verification only. Does not claim real browser playback. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const origin=process.argv[2]||'http://localhost:4173';
const target=process.argv[3]||'quality/audio-port-http-local.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const meta=read('src/data/audio-index-meta.json');
const cases=read('src/data/audio-playback-check.json');
const photos=read('src/data/responsive-photos.json');
const jobs=[...Array.from({length:256},(_,i)=>({url:`${meta.baseUrl}/${i.toString(16).padStart(2,'0')}.json`,kind:'lookup'})),...Object.values(photos).flatMap(p=>p.variants.map(v=>({url:v.url,kind:'photo'}))),...cases.map(c=>({url:c.url,kind:c.kind,range:true}))];
let next=0;const results=[];
async function check(job){
 try{
  const response=await fetch(new URL(job.url,origin),{headers:job.range?{Range:'bytes=0-127'}:{},signal:AbortSignal.timeout(20000)});
  const bytes=Buffer.from(await response.arrayBuffer()),mime=response.headers.get('content-type')||'';
  const local=fs.readFileSync('public'+job.url);const expected=job.range?local.subarray(0,bytes.length):local;
  const ok=[200,206].includes(response.status)&&bytes.equals(expected)&&(job.kind==='lookup'?mime.includes('json'):job.kind==='photo'?mime.startsWith('image/'):mime.startsWith('audio/'));
  results.push({...job,status:response.status,mime,bytes:bytes.length,ok});
 }catch(error){results.push({...job,ok:false,error:String(error)});}
}
await Promise.all(Array.from({length:8},async()=>{while(next<jobs.length)await check(jobs[next++]);}));
const html=await(await fetch(origin)).text();const main=html.match(/<script[^>]+src="([^\"]+\.js)"/)?.[1];
const source=main?await(await fetch(new URL(main,origin))).text():'';
const pointers=new Set(source.match(/\/audio\/[a-f0-9]{24}\.mp3/g)||[]);
const sw=await(await fetch(new URL('/sw.js',origin))).text();
const report={origin,indexRevision:meta.revision,lookupParts:256,photoVariants:994,playbackCaseMP3:cases.length,requested:jobs.length,passed:results.filter(r=>r.ok).length,errors:results.filter(r=>!r.ok),mainEntry:main,mainEntryBytes:Buffer.byteLength(source),mainEntrySHA256:crypto.createHash('sha256').update(source).digest('hex'),initialBundleUniqueMP3Pointers:pointers.size,fullIndexNotInInitialBundle:pointers.size<200,persistentPlayerInBundle:source.includes('romana-audio-player'),lookupCacheInServiceWorker:sw.includes('romana-audio-lookup-v1'),lookupPartsNotPrecached:!sw.includes(meta.baseUrl),responsivePhotosNotPrecached:!sw.includes('/photos/responsive/'),browserPlaybackVerified:false,physicalListeningVerified:false,scope:'HTTP MIME and bytes compared against local assets; no browser click, currentTime or audible output was observed.'};
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(report.errors.length||!report.fullIndexNotInInitialBundle||!report.persistentPlayerInBundle||!report.lookupCacheInServiceWorker||!report.lookupPartsNotPrecached)process.exitCode=1;
