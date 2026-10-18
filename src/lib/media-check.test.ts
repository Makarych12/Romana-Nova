import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('./audio-index',()=>({resolveAudioFile:async(text:string)=>text==='apă'?'/audio/water.mp3':undefined}));
import {checkAudioDelivery} from './media-check';
afterEach(()=>vi.unstubAllGlobals());
function response(status:number,type:string,bytes:number[]){return {status,headers:new Headers({'Content-Type':type}),arrayBuffer:async()=>new Uint8Array(bytes).buffer}}
describe('MP3 в Vite и на static hosting',()=>{
 it('подтверждает настоящий HTTP206 с MP3-заголовком',async()=>{const fetcher=vi.fn().mockResolvedValue(response(206,'audio/mpeg',[0x49,0x44,0x33,4]));vi.stubGlobal('fetch',fetcher);expect(await checkAudioDelivery('Слово','apă')).toMatchObject({ok:true,status:206,url:'/audio/water.mp3'});expect(fetcher.mock.calls[0][1].headers.Range).toBe('bytes=0-127')});
 it('не принимает HTML SPA-fallback со статусом200 за аудио',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(200,'text/html',[60,104,116,109,108])));expect((await checkAudioDelivery('Слово','apă')).ok).toBe(false)});
 it('обрабатывает offline,404 и отсутствующий манифест',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));expect((await checkAudioDelivery('Слово','apă')).ok).toBe(false);expect((await checkAudioDelivery('Слово','нет записи')).error).toContain('манифесте');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(404,'audio/mpeg',[0x49,0x44,0x33])));expect((await checkAudioDelivery('Слово','apă')).ok).toBe(false)});
});
