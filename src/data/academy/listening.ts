import monologues from "./monologues.json" with {type:"json"};
import {dialogues} from '../dialogues.ts';
import {lessons,type Level} from '../course.ts';
import curated from '../curated-vocabulary.json' with {type:'json'};
import type {Exercise} from '../../lib/exercises.ts';
export type ListeningTask=Exercise&{theme:string;level:Level;mechanic:string;transcript:string};
const lines=[...new Map([
 ...dialogues.flatMap(d=>d.pairs.map(p=>({...p,theme:d.subtitle.replace('Диалог · ',''),level:d.level,wordId:`academy:dialogue:${d.id}`}))),
 ...lessons.flatMap(l=>l.pairs.map(p=>({...p,theme:l.title,level:l.level,wordId:`academy:lesson:${l.id}`}))),
 ...curated.flatMap(w=>w.examples.map(p=>({...p,theme:w.theme,level:w.level as Level,wordId:w.id}))),
].map(p=>[p.ro,p])).values()];
const distractors=(answer:string,index:number,field:'ro'|'ru'='ru')=>[answer,...Array.from({length:20},(_,j)=>lines[(index+j*37+1)%lines.length][field]).filter(x=>x!==answer).filter((x,i,a)=>a.indexOf(x)===i).slice(0,3)];
export const listeningTasks:ListeningTask[]=lines.slice(0,540).map((p,i)=>{
 const tokens=p.ro.split(' ');const gapIndex=tokens.findIndex((x,j)=>j>0&&x.replace(/[^\p{L}]/gu,'').length>3);const gap=gapIndex>=0?gapIndex:tokens.length-1;
 const mechanic=i%4===0?'Диктант':i%4===1?'Значение':i%4===2&&tokens.length>2?'Пропуск':'Аудио → текст';
 const cloze=mechanic==='Пропуск',dictation=mechanic==='Диктант',textChoice=mechanic==='Аудио → текст';
 return {id:`academy:listen:line:${i}`,theme:p.theme,level:p.level,mechanic,transcript:p.ro,kind:dictation||cloze?'listen':'choice',prompt:dictation?'Прослушайте и запишите всю реплику.':cloze?`Дополните по записи: ${tokens.map((t,j)=>j===gap?'_____':t).join(' ')}`:textChoice?'Выберите румынскую реплику, которую услышали.':'Выберите значение услышанной реплики.',answer:dictation?p.ro:cloze?tokens[gap]:textChoice?p.ro:p.ru,options:dictation||cloze?undefined:distractors(textChoice?p.ro:p.ru,i,textChoice?'ro':'ru'),audio:p.ro,why:`${p.ro} — ${p.ru}`,skill:'listening',wordId:p.wordId};
});
for(const d of dialogues){
 const phrases=d.pairs.slice(0,3);const text=phrases.map(p=>p.ro).join(' ');
 listeningTasks.push({id:`academy:listen:order:${d.id}`,theme:d.subtitle,level:d.level,mechanic:'Порядок реплик',transcript:text,kind:'build',buildUnits:phrases.map(p=>p.ro),prompt:'Прослушайте начало разговора. Соберите реплики в услышанном порядке.',answer:text,audio:text,why:phrases.map(p=>`${p.note}: ${p.ro} — ${p.ru}`).join('\n'),skill:'listening',wordId:`academy:dialogue:${d.id}`});
}
const questions=[
 ['Numere și prețuri','A1','Cafeaua costă doisprezece lei.','Сколько стоит кофе?','12 леев','20 леев','2 лея','Кофе стоит двенадцать леев.'],
 ['Numere și prețuri','A1','Două bilete costă patruzeci de lei.','Сколько стоят два билета?','40 леев','14 леев','4 лея','Два билета стоят сорок леев.'],
 ['Ora și data','A1','Trenul pleacă la ora șapte și jumătate.','Во сколько отправляется поезд?','В 7:30','В 7:15','В 8:30','Поезд отправляется в половине восьмого.'],
 ['Ora și data','A1','Programarea este pe cincisprezece mai.','На какую дату назначен приём?','15 мая','5 мая','15 марта','Приём назначен на пятнадцатое мая.'],
 ['Telefon','A2','Vă sun mâine dimineață, după ora nouă.','Когда позвонит говорящий?','Завтра утром после девяти','Сегодня в девять','Завтра вечером','Я позвоню вам завтра утром после девяти.'],
 ['Locuință','A2','Chiria este de cinci sute de euro, fără utilități.','Включены ли коммунальные платежи?','Нет, они оплачиваются отдельно','Да, включены','Включена только вода','Аренда — пятьсот евро без коммунальных услуг.'],
 ['Hotel','A2','Camera este disponibilă de la ora paisprezece.','Когда доступен номер?','С 14:00','С 12:00','С 4:00','Номер доступен с четырнадцати часов.'],
 ['Anunțuri','A2','Atenție! Trenul pentru Brașov are o întârziere de douăzeci de minute.','Какова задержка поезда?','20 минут','12 минут','2 минуты','Внимание! Поезд в Брашов задерживается на двадцать минут.'],
 ['Anunțuri','B1','Din cauza lucrărilor, autobuzul nu oprește în această stație.','Почему автобус здесь не останавливается?','Из-за ремонтных работ','Из-за отсутствия пассажиров','Из-за окончания маршрута','Из-за ремонтных работ автобус не останавливается на этой остановке.'],
 ['Medic','A2','Vă rog să veniți la control peste două săptămâni.','Когда просят прийти на контроль?','Через две недели','Через два дня','Через два месяца','Пожалуйста, приходите на контроль через две недели.'],
 ['Instituții','B1','Cererea poate fi depusă online sau la ghișeu.','Как можно подать заявление?','Онлайн или в окне приёма','Только по телефону','Только почтой','Заявление можно подать онлайн или в окне приёма.'],
 ['Muncă','B1','Ședința a fost amânată până vineri.','Что случилось с совещанием?','Его отложили до пятницы','Его отменили навсегда','Оно состоялось в четверг','Совещание отложили до пятницы.'],
 ['Interviu','B1','Am lucrat trei ani în acest domeniu.','Каков опыт кандидата в этой области?','Три года','Три месяца','Тридцать лет','Я работал(а) три года в этой области.'],
 ['Feroviar','B1','Raportul de inspecție este la șeful de depou.','У кого отчёт об осмотре?','У начальника депо','У пассажира','У кассира','Отчёт об осмотре находится у начальника депо.'],
 ['Povestiri','B1','Înainte locuiam la Cluj, dar anul trecut m-am mutat la București.','Где говорящий живёт сейчас?','В Бухаресте','В Клуже','В Брашове','Раньше я жил(а) в Клуже, но в прошлом году переехал(а) в Бухарест.'],
 ['Povestiri','B2','Deși oferta era avantajoasă, am refuzat-o fiindcă presupunea prea multe deplasări.','Почему предложение отклонили?','Оно требовало слишком многих поездок','Оно было невыгодным','Оно не требовало поездок','Хотя предложение было выгодным, я отказался(-лась), поскольку оно предполагало слишком много поездок.'],
 ['Muncă','B2','Dacă aș fi primit mesajul la timp, aș fi participat la ședință.','Участвовал ли говорящий в совещании?','Нет, сообщение пришло слишком поздно','Да, он участвовал','Он ещё решает','Если бы я получил(а) сообщение вовремя, я бы участвовал(а) в совещании.'],
 ['Argumentare','C1','Nu contest utilitatea proiectului, ci modul în care au fost stabilite prioritățile.','Что оспаривает говорящий?','Способ определения приоритетов','Саму полезность проекта','Существование проекта','Я оспариваю не полезность проекта, а то, как были определены приоритеты.'],
 ['Argumentare','C1','În măsura în care datele vor fi confirmate, concluzia poate fi menținută.','От чего зависит сохранение вывода?','От подтверждения данных','От количества участников','От изменения названия','Если данные будут подтверждены, вывод может быть сохранён.'],
 ['Feroviar','B2','Defecțiunea a fost consemnată în raport, iar verificarea va fi efectuată de personalul autorizat.','Кто выполнит проверку?','Уполномоченный персонал','Любой пассажир','Автор объявления лично','Неисправность зафиксирована в отчёте, а проверку выполнит уполномоченный персонал.'],
] as const;
questions.forEach(([theme,level,text,prompt,answer,b,c,translation],i)=>listeningTasks.push({id:`academy:listen:question:${i}`,theme,level,mechanic:'Вопрос по услышанному',transcript:text,kind:'choice',prompt,answer,options:[answer,b,c],audio:text,why:`${text} — ${translation}`,skill:'listening',wordId:`academy:listening:question:${i}`}));
for(const story of monologues)story.questions.forEach(([prompt,answer,b,c],i)=>listeningTasks.push({id:`academy:listen:monologue:${story.id}:${i}`,theme:'Рассказ · '+story.theme,level:story.level as Level,mechanic:'Вопрос по услышанному',transcript:story.text,kind:'choice',prompt,answer,options:[answer,b,c],audio:story.text,why:`${story.text} — ${story.ru}`,skill:'listening',wordId:`academy:listening:story:${story.id}`}));
export type VoiceScenario={id:string;dialogueId:string;title:string;level:Level;role:string;promptRo:string;promptRu:string;targetRo:string;targetRu:string;continuationRo?:string;continuationRu?:string};
export const voiceScenarios:VoiceScenario[]=dialogues.flatMap(d=>d.pairs.slice(1).map((p,i)=>({id:`academy:voice:${d.id}:${i+1}`,dialogueId:d.id,title:d.title,level:d.level,role:p.note||'Участник',promptRo:d.pairs[i].ro,promptRu:d.pairs[i].ru,targetRo:p.ro,targetRu:p.ru,continuationRo:d.pairs[i+2]?.ro,continuationRu:d.pairs[i+2]?.ru})));
export const listeningAudioTexts=()=>[...new Set(listeningTasks.map(t=>t.audio!).filter(Boolean))];
