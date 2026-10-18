import fs from 'node:fs';
import crypto from 'node:crypto';
import { words } from '../src/data/course.ts';
import { dialogues, dialogueAudio } from '../src/data/dialogues.ts';
import { audioKey, normalizeAudioText, audioLookupPrefix } from '../src/lib/audio-text.ts';
const manifest=JSON.parse(fs.readFileSync('src/data/audio-manifest.json','utf8'));
const normalized=new Map(),exact=new Map();
for(const [text,url] of Object.entries(manifest)){
 if(!/^\/audio\/[a-f0-9]{24}\.mp3$/.test(url)||!fs.existsSync('public'+url))throw Error('Invalid MP3: '+url);
 exact.set(audioKey(text),url);
 const key=normalizeAudioText(text);const values=normalized.get(key)||new Set();values.add(url);normalized.set(key,values);
}
const parts=Object.fromEntries(Array.from({length:256},(_,i)=>[i.toString(16).padStart(2,'0'),{}]));
for(const [text,url]of exact)parts[audioLookupPrefix(text)]['='+text]=url;
const ambiguous=[];
for(const [key,urls]of normalized)if(urls.size===1)parts[audioLookupPrefix(key)][key]=[...urls][0];else ambiguous.push(key);
const body=JSON.stringify(parts);const revision=crypto.createHash('sha256').update(body).digest('hex').slice(0,12);
const baseUrl='/audio/lookup/'+revision;fs.mkdirSync('public'+baseUrl,{recursive:true});
const sizes=[];for(const [prefix,rows]of Object.entries(parts)){const text=JSON.stringify(rows);sizes.push(Buffer.byteLength(text));fs.writeFileSync('public'+baseUrl+'/'+prefix+'.json',text);}
// Small bootstrap only: immediate playback for initial cards and diagnostics.
const common=new Set(['cafea','împreună','Învățăm împreună.','Bună ziua! Învăț limba română.',...words.flatMap(w=>[w.ro,...w.examples.map(e=>e.ro)])]);
const bootstrap={};for(const text of common){const key=audioKey(text),url=exact.get(key);if(url){bootstrap['='+key]=url;const urls=normalized.get(normalizeAudioText(key));if(urls?.size===1)bootstrap[normalizeAudioText(key)]=url;}}
fs.writeFileSync('src/data/audio-bootstrap.json',JSON.stringify(bootstrap)+'\n');
const meta={revision,baseUrl,files:Object.keys(manifest).length,shards:256,maxShardBytes:Math.max(...sizes),bootstrapTexts:common.size,ambiguousNormalizedKeys:ambiguous};
fs.writeFileSync('src/data/audio-index-meta.json',JSON.stringify(meta,null,2)+'\n');
// Full index retained as a build/audit artifact, never imported by the app.
fs.writeFileSync('public/audio/index.json',JSON.stringify(manifest));
const samples=[
 ...[...words.filter(w=>w.ro==='cafea'),...words.filter(w=>w.ro!=='cafea')].slice(0,20).map(w=>({kind:'card',id:w.id,text:w.ro})),
 ...words.flatMap(w=>w.examples.map((e,i)=>({kind:'example',id:w.id+':'+i,text:e.ro}))).slice(0,10),
 ...dialogues.slice(0,3).map(d=>({kind:'dialogue',id:d.id,text:dialogueAudio(d)})),
].map(row=>({...row,url:manifest[audioKey(row.text)]}));
if(samples.some(row=>!row.url))throw Error('Missing playback-check MP3');
fs.writeFileSync('src/data/audio-playback-check.json',JSON.stringify(samples,null,2)+'\n');
console.log(JSON.stringify(meta));
