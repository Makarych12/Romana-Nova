import { words as original, type Word } from "../data/course";
import meta from "../data/catalog-meta.json";
export { meta as catalogMeta };
let notice='';
export const vocabularyNotice=()=>notice;
let data: Word[] | null = null;
let pending: Promise<Word[]> | null = null;
export async function loadVocabulary(): Promise<Word[]> {
  if (data) return data;
  if (pending) return pending;
  pending=(async()=>{
    const fallback=(meta as {fallbackUrls?:string[]}).fallbackUrls||[];
    let lastError:unknown;
    for(const url of [meta.url,...fallback]) {
      try {
        const response=await fetch(url);
        if(!response.ok)throw Error('Словарь недоступен.');
        const json:unknown=await response.json();
        if(!Array.isArray(json)||!json.every(w=>typeof w.id==='string'&&typeof w.ro==='string'&&typeof w.ru==='string'&&Array.isArray(w.examples)))throw Error('Файл словаря повреждён.');
        data=json as Word[];
        notice=url===meta.url?'':'Открыта ранее сохранённая версия словаря. Новые примеры и фотографии появятся после подключения к сети и перезагрузки приложения.';
        return data;
      }catch(error){lastError=error;}
    }
    throw lastError instanceof Error?new Error('Не удалось загрузить полный словарь или его сохранённую версию. Проверьте сеть.'):Error('Словарь недоступен.');
  })().catch(error=>{pending=null;throw error;});
  return pending;
}
export const originalWords = original;
