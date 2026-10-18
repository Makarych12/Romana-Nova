import type {Word} from '../data/course';
export type QualityCode='duplicate-id'|'duplicate-headword'|'diacritics'|'mixed-script'|'translation-missing'|'examples-incomplete'|'example-duplicate'|'example-fragment'|'example-generic'|'example-numbers'|'forms-missing'|'pos-conflict'|'level-unverified'|'level-complexity'|'editorial-unverified';
export type QualityIssue={id:string;ro:string;code:QualityCode;severity:'error'|'review'|'incomplete';field:string;detail:string};
export const qualityLabels:Record<QualityCode,string>={
 'duplicate-id':'Повтор ID','duplicate-headword':'Повтор заголовка','diacritics':'Диакритика или Unicode','mixed-script':'Смешение алфавитов','translation-missing':'Проверить русский перевод','examples-incomplete':'Меньше двух примеров','example-duplicate':'Повтор примера','example-fragment':'Короткий пример без полного контекста','example-generic':'Шаблонный пример','example-numbers':'Сверить числа в переводе','forms-missing':'Не проверены грамматические формы','pos-conflict':'Проверить часть речи','level-unverified':'Уровень оценочный','level-complexity':'Проверить сложность уровня','editorial-unverified':'Нужна языковая редактура'
};
const canonical=(text:string)=>text.normalize('NFC').toLocaleLowerCase('ro').replace(/^a\s+/,'').replace(/\s+/g,' ').trim();
export function auditLexicon(words:Word[]):QualityIssue[]{
 const issues:QualityIssue[]=[];const ids=new Map<string,string>();const heads=new Map<string,string>();
 for(const w of words){
  const add=(code:QualityCode,severity:QualityIssue['severity'],field:string,detail:string)=>issues.push({id:w.id,ro:w.ro,code,severity,field,detail});
  const key=canonical(w.ro);
  if(ids.has(w.id))add('duplicate-id','error','id',`ID уже принадлежит ${ids.get(w.id)}`);ids.set(w.id,w.ro);
  if(heads.has(key))add('duplicate-headword','error','ro',`Совпадает с ${heads.get(key)} после нормализации инфинитива и Unicode`);heads.set(key,w.id);
  for(const [field,text]of [['ro',w.ro],['forms',w.forms],...w.examples.map((e,i)=>[`examples.${i}.ro`,e.ro])]){
   if(/[şţŞŢ\uFFFD]/.test(text)||text!==text.normalize('NFC'))add('diacritics','error',field,'Нестандартная диакритика, символ замены или ненормализованный Unicode');
   if((text.match(/[\p{L}]+/gu)||[]).some(token=>/[А-Яа-яЁё]/.test(token)&&/[A-Za-zĂÂÎȘȚăâîșț]/.test(token)))add('mixed-script','review',field,'В румынском поле найдены латиница и кириллица; русское пояснение в forms допустимо, проверьте контекст');
  }
  if(!w.ru.trim()||!/[А-Яа-яЁё]/.test(w.ru))add('translation-missing','review','ru','Русский перевод отсутствует или не содержит кириллицы');
  if(w.examples.length<2)add('examples-incomplete','incomplete','examples',`Добавлено ${w.examples.length} из двух необходимых примеров`);
  const local=new Set<string>();
  for(const [i,e]of w.examples.entries()){
   const norm=e.ro.normalize('NFC').toLocaleLowerCase('ro').replace(/[.,!?;:]/g,'').replace(/\s+/g,' ').trim();
   if(local.has(norm))add('example-duplicate','error',`examples.${i}`,`Повтор одной фразы внутри карточки: ${e.ro}`);local.add(norm);
   if(!e.ru.trim()||!/[А-Яа-яЁё]/.test(e.ru))add('translation-missing','review',`examples.${i}.ru`,'У примера нет русского перевода');
   if(e.ro.trim().split(/\s+/).length<3&&!/[.!?…]$/.test(e.ro.trim()))add('example-fragment','review',`examples.${i}`,'Возможно, это словосочетание вместо естественного предложения');
   if(/^Ce înseamnă\s*[„"«]/i.test(e.ro))add('example-generic','review',`examples.${i}`,'Мета-вопрос о значении слова не даёт полноценного контекста');
   const numbers=(s:string)=>(s.match(/\b\d{2,}\b/g)||[]).sort().join(',');
   if(numbers(e.ro)&&numbers(e.ru)&&numbers(e.ro)!==numbers(e.ru))add('example-numbers','review',`examples.${i}`,'Числа в румынском примере и переводе различаются');
  }
  if(/существительное|сущ\.|глагол|прилагательное/.test(w.pos)&&!w.forms.trim())add('forms-missing','incomplete','forms','Формы и ограничения употребления ещё не подготовлены');
  if(/союз|предлог|наречие|междометие/.test(w.pos)&&/[мжс]р?\.\s*р\./.test(w.pos)&&!/существительное|сущ\.|омоним|омограф/.test(w.pos))add('pos-conflict','review','pos','У служебной части речи неожиданно указан род');
  if(/глагол/.test(w.pos)&&/(?:анный|енный|ённый|нутый|тый)(?:[;,]|$)/i.test(w.ru))add('pos-conflict','review','pos','Русский перевод похож на причастие или прилагательное, а запись помечена глаголом');
  if(w.levelEstimated)add('level-unverified','review','level','Частотная оценка не является независимой разметкой CEFR');
  if(w.levelEstimated&&['A0','A1'].includes(w.level)&&(w.ro.split(/\s+/).length>=4||/электромагнит|иммуноглоб|юриспруд|эпистемолог|нейротранс|гидрокарбон/i.test(w.ru)))add('level-complexity','review','level','Длина выражения или специальная терминология требуют проверки начального уровня');
  if(w.quality==='reference'&&w.editorial?.status!=='reviewed')add('editorial-unverified','review','entry','Прямой словарный источник не заменяет редактуру перевода и употребления');
 }
 return issues;
}
