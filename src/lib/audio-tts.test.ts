// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { requestPiper, rememberPiper } from "./audio-tts";
afterEach(() => vi.unstubAllGlobals());
it("Piper проверяет румынский health и использует один аудиоответ", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({language:'ro-RO',voice:'Piper/Mihai'}))).mockResolvedValueOnce(new Response('MP3',{headers:{'Content-Type':'audio/mpeg','X-Speech-Language':'ro-RO'}}));
  vi.stubGlobal('fetch',fetcher);const blob=await requestPiper('cafea',new AbortController().signal);expect(blob?.size).toBe(3);expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[1][0]).toContain('text=cafea');
});
it("не обращается к TTS, если endpoint болгарский или отсутствует на static hosting", async () => {
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({language:'bg-BG',voice:'Piper/Dimitar'})));vi.stubGlobal('fetch',fetcher);
  expect(await requestPiper('cafea',new AbortController().signal)).toBeUndefined();expect(fetcher).toHaveBeenCalledOnce();
  fetcher.mockResolvedValueOnce(new Response('Not found',{status:404}));expect(await requestPiper('cafea',new AbortController().signal)).toBeUndefined();
});
it("не принимает HTML или аудио другого языка",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({language:'ro-RO',voice:'Piper/Mihai'}))).mockResolvedValueOnce(new Response('HTML',{headers:{'Content-Type':'text/html'}}));vi.stubGlobal('fetch',fetcher);expect(await requestPiper('test',new AbortController().signal)).toBeUndefined();
});
it("сохраняет один ответ Piper для офлайн-повтора без второго HTTP-запроса", async () => {
 const rows=new Map<string,Response>();
 const cache={put:vi.fn(async(key:string,value:Response)=>rows.set(key,value.clone())),match:vi.fn(async(key:string)=>rows.get(key)?.clone()),keys:vi.fn(async()=>[]),delete:vi.fn()};
 vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 vi.stubGlobal('Response',class { headers:Headers; constructor(private value:Blob,init:ResponseInit){this.headers=new Headers(init.headers)} clone(){return this} async blob(){return this.value} });
 const blob=new Blob(['MP3'],{type:'audio/mpeg'});await rememberPiper('Frază nouă',blob);
 vi.stubGlobal('navigator',{onLine:false});const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const cached=await requestPiper('FRAZĂ NOUĂ',new AbortController().signal);expect(cached).toBe(blob);expect(cached?.size).toBe(3);expect(fetcher).not.toHaveBeenCalled();
});
