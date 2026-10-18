import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../data/catalog-meta.json',()=>({default:{url:'/data/current.json',fallbackUrls:['/data/previous.json']}}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules()});
it('восстанавливает кешируемый старый каталог при недоступности новой версии',async()=>{
 const word={id:'w0',ro:'apă',ru:'вода',examples:[]};
 const fetch=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ok:true,json:async()=>[word]});vi.stubGlobal('fetch',fetch);
 const lib=await import('./vocabulary');expect(await lib.loadVocabulary()).toEqual([word]);expect(fetch.mock.calls.map(c=>c[0])).toEqual(['/data/current.json','/data/previous.json']);expect(lib.vocabularyNotice()).toContain('ранее сохранённая');
});
it('не принимает HTML или повреждённый JSON за словарь и допускает повтор',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({html:'fallback'})});vi.stubGlobal('fetch',fetch);
 const lib=await import('./vocabulary');await expect(lib.loadVocabulary()).rejects.toThrow('Не удалось');await expect(lib.loadVocabulary()).rejects.toThrow('Не удалось');expect(fetch).toHaveBeenCalledTimes(4);
});
