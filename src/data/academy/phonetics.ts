import type { Exercise } from '../../lib/exercises';
import stressData from './stress.json' with {type:'json'};
export const phoneticSources = [
 {name:'DOOM³ · Алфавит и значения букв',url:'https://doom.lingv.ro/studiu_introductiv/semne_grafice'},
 {name:'DOOM³ · Правила произношения и ударение',url:'https://doom.lingv.ro/studiu_introductiv/reguli_scriere_pronuntare'},
 {name:'DOOM³ · Деление на слоги и перенос',url:'https://doom.lingv.ro/studiu_introductiv/despartire_capat_rand'},
];
export type Letter = {lower:string;upper:string;name:string;nameAudio:string;ipa:string;explanation:string;examples:{ro:string;ru:string}[]};
// One accepted Romanian name per letter. Other standard names are in DOOM³.
const letterRows = [
 ['a','a','a','/a/','Откройте рот, язык лежит низко. Не превращайте безударное a в русское редуцированное «а».','apă|вода','avion|самолёт'],
 ['ă','ă','ă','/ə/','Губы расслаблены, язык в середине рта. Короткий нейтральный гласный: не полное «а», не «э». Сравните casă и casa: окончание меняет и звук, и форму слова.','apă|вода','casă|дом'],
 ['â','î din a','î din a','/ɨ/','Поднимите среднюю часть языка высоко, губы не округляйте. Русское «ы» — лишь опора; сверяйтесь с записью. Â и Î обозначают один гласный.','pâine|хлеб','mână|рука'],
 ['b','be','be','/b/','Сомкните губы и разомкните с голосом. Не добавляйте гласный после конечной согласной.','ban|деньга','bun|хороший'],
 ['c','ce','ce','/k/, /tʃ/','Перед e, i обычно аффриката /tʃ/; перед a, o, u и согласной — /k/. Смотрите соседние буквы.','casă|дом','cinci|пять'],
 ['d','de','de','/d/','Кончик языка у верхних зубов. Не подменяйте название de самим согласным /d/.','doi|два','drum|дорога'],
 ['e','e','e','/e/, /j/, /e̯/','Обычно /e/. В eu, el, este начальное e имеет особое чтение. В ea, deal участвует в сочетании звуков.','elev|ученик','este|есть (он/она)'],
 ['f','ef','ef','/f/','Нижняя губа касается верхних зубов; голосовые связки не вибрируют.','fată|девочка','foc|огонь'],
 ['g','ghe','ghe','/ɡ/, /dʒ/','Перед e, i обычно звонкая аффриката /dʒ/. В ga, go, gu сохраняется /ɡ/.','gară|вокзал','gem|джем'],
 ['h','haș','haș','/h/','Мягкий выдох через открытую гортань. В che, chi, ghe, ghi буква h отдельно не звучит.','hotel|гостиница','hartă|карта'],
 ['i','i','i','/i/, /j/, /ʲ/','Может быть гласным, полугласным или знаком краткого смягчения в конце. Не приписывайте каждому i отдельный слог.','inimă|сердце','pomi|деревья'],
 ['î','î din i','î din i','/ɨ/','Тот же звук, что у â. Î обычно в начале и конце, а также сохраняется после приставки: neînțeles.','în|в','înger|ангел'],
 ['j','je','je','/ʒ/','Щелевой звонкий звук, близкий русскому «ж». Воздух идёт непрерывно, без начальной смычки «д».','joc|игра','joi|четверг'],
 ['k','ka','ka','/k/','Встречается в заимствованиях; обычный /k/.','kilogram|килограмм','kilometru|километр'],
 ['l','el','el','/l/','Кончик языка касается верхних альвеол, воздух идёт по бокам.','lapte|молоко','lună|луна, месяц'],
 ['m','em','em','/m/','Губы сомкнуты, голос и воздух проходят через нос.','masă|стол','mamă|мама'],
 ['n','en','en','/n/','Язык у верхних зубов, воздух идёт через нос.','nas|нос','noapte|ночь'],
 ['o','o','o','/o/, /o̯/','Округлите губы. В soare o входит в дифтонг oa; это не два независимых слога.','om|человек','soare|солнце'],
 ['p','pe','pe','/p/','Разомкните губы без голоса. Не добавляйте сильный английский придыхательный выдох.','pat|кровать','pom|дерево'],
 ['q','kü','Q','зависит от заимствования','Буква используется в заимствованиях и именах. Название kü произносится с округлённым передним гласным /y/; Для названия используется отдельный синтезированный образец /ky/, а не стандартное чтение символа Q в TTS.','Qatar|Катар','quasar|квазар'],
 ['r','er','er','/r/','Кончик языка у альвеол, лёгкая вибрация или краткий удар. Не используйте английский ретрофлексный r.','roată|колесо','râu|река'],
 ['s','es','es','/s/','Язык близко к альвеолам, узкая струя воздуха; голос выключен. Отличайте s от ș.','sare|соль','sac|мешок'],
 ['ș','șe','șe','/ʃ/','Поднимите переднюю часть языка к области за альвеолами, оставьте щель. Губы слегка округлены. Воздух идёт без начального «т». Запятая под буквой обязательна.','șase|шесть','școală|школа'],
 ['t','te','te','/t/','Короткая глухая смычка у верхних зубов. Отличайте простой /t/ от аффрикаты ț /ts/.','tren|поезд','trei|три'],
 ['ț','țe','țe','/ts/','Начните как /t/ у верхних зубов и сразу выпустите воздух в /s/. Один слитный звук, близкий «ц»; не «тэ-зэ».','țară|страна','țap|козёл'],
 ['u','u','u','/u/, /w/','Округлите и вытяните губы; язык сзади. В дифтонгах u бывает неслоговым.','unu|один','urs|медведь'],
 ['v','ve','ve','/v/','Положение губ и зубов как у f, но с голосом.','vin|вино','vânt|ветер'],
 ['w','dublu ve','dublu ve','/v/, /w/','Чтение зависит от языка заимствования: сравните watt и weekend. Не задавайте всем w одно значение.','watt|ватт','weekend|выходные'],
 ['x','ics','ics','/ks/, /ɡz/','Два согласных в одной букве: taxi /ks/, examen /ɡz/. Проверяйте конкретное слово.','taxi|такси','examen|экзамен'],
 ['y','i grec','i grec','/i/, /j/ и др.','В заимствованиях и именах: чтение проверяется по словарю, а не по английскому алфавиту.','yoga|йога','yeti|йети'],
 ['z','ze','ze','/z/','Как s, но с голосом. В конце слова сохраняйте звонкость в образце диктора.','zi|день','zece|десять'],
];
export const alphabet:Letter[] = letterRows.map(([lower,name,nameAudio,ipa,explanation,...examples])=>({lower,upper:lower.toLocaleUpperCase('ro'),name,nameAudio,ipa,explanation,examples:examples.map(x=>{const [ro,ru]=x.split('|');return {ro,ru};})}));
export type PhoneticLesson = {id:string;title:string;explanation:string;tip:string;examples:{ro:string;ru:string}[]};
const lessonRows = [
 ['diacritics','Пять букв с диакритикой','Ă /ə/ отличается от A /a/. Â и Î — один /ɨ/, но разное написание. Ș /ʃ/ и Ț /ts/ — самостоятельные буквы, не декоративные варианты s и t.','Печатайте ș, ț с запятой снизу. Старые ş, ţ с седилью — другие символы Unicode.','apă|вода','mână|рука','în|в','șase|шесть','țară|страна'],
 ['c','C: /k/ или /tʃ/','Перед a, o, u и согласной c обычно /k/: casă, cort, cuvânt. Перед e, i — /tʃ/. Сравнивайте всю группу, не только букву.','/tʃ/ — смычка и шипение слитно. Не произносите две отдельные буквы «т-ш».','casă|дом','cort|палатка','cuvânt|слово','cinci|пять'],
 ['ce-ci','CE / CI','В cer слышно /tʃe/, в cinema — /tʃi/. Но в ceară буква e не создаёт самостоятельный /e/: сочетание cea читается /tʃa/. В ciot i тоже не отдельный гласный.','В конечном reci буква i не создаёт второй слог. Не читайте каждую e и i механически.','cer|небо','cinema|кинотеатр','ceară|воск','ciot|обрубок','reci|холодные'],
 ['g','G: /ɡ/ или /dʒ/','В gară, gură и glob g читается /ɡ/. Перед e, i обычно /dʒ/. Это звонкий парный звук к /tʃ/.','/dʒ/ начинается со смычки. J /ʒ/ звучит непрерывно, без «д».','gară|вокзал','gură|рот','glob|шар','gem|джем'],
 ['ge-gi','GE / GI','В gem /dʒe/, в girafă /dʒi/. В geam буква e служебная: сочетание gea передаёт /dʒa/. В конечном dragi i отдельно не звучит.','Отличайте gem от ghem: h меняет чтение g перед e.','gem|джем','girafă|жираф','geam|оконное стекло','dragi|дорогие'],
 ['che-chi','CHE / CHI','H сохраняет /k/ перед e и i: cheie, chitară. Отдельного звука h нет. В chiar и ochi i не образует отдельный гласный.','В румынских che, chi нет звука русского «ч». Перед e/i согласный может иметь оттенок палатализации.','cheie|ключ','chitară|гитара','chiar|даже, именно','ochi|глаз, глаза'],
 ['ghe-ghi','GHE / GHI','H сохраняет /ɡ/ перед e и i: ghem, ghindă. В gheață e не произносится отдельно; в unghi конечное i служит показателем чтения согласного.','Сопоставьте geam /dʒ/ и gheață /ɡ/: не вставляйте h как отдельный выдох.','ghem|клубок','ghindă|жёлудь','gheață|лёд','unghi|угол'],
 ['j-h','J и H','J — звонкий щелевой /ʒ/, как в joc. H вне специальных групп произносится с выдохом: hotel. В che/chi/ghe/ghi h не имеет отдельного звука.','Не путайте j /ʒ/ и ge/gi /dʒ/. У /ʒ/ нет начальной смычки.','joc|игра','joi|четверг','hotel|гостиница','hartă|карта'],
 ['e','Особые случаи E','В личных местоимениях eu, el, ei и формах a fi ești, este, eram начальное e имеет традиционное чтение с /j/. В elev начальное e — /e/, не «йе».','Это ограниченная группа слов. Нельзя добавлять /j/ перед каждым начальным e.','eu|я','el|он','este|есть','eram|был(а)','elev|ученик'],
 ['i-final','I и конечное I','В inimă i — гласный. В iar — полугласный /j/. В pomi, lupi конечное безударное i обычно обозначает краткую палатализацию согласного и не отдельный слог.','Есть исключения: в taxi и инфинитиве a citi конечное i слоговое; после согласного + r/l, например membri, оно также произносится полно.','inimă|сердце','iar|снова','pomi|деревья','lupi|волки','taxi|такси','a citi|читать','membri|члены'],
 ['vowels','Гласные, дифтонги и зияние','Не все соседние гласные образуют два слога. В soare — дифтонг oa, в pâine — âi. В aer гласные находятся в разных слогах. Граница определяется произношением слова.','Не переносите русскую редукцию: сохраняйте качество безударных гласных, особенно ă, a, e.','soare|солнце','pâine|хлеб','aer|воздух','două|две'],
 ['stress','Как устроено ударение','Ударный слог выделяется голосом и длительностью. Ударение свободное: его нельзя вычислить по последней букве. Сначала слушайте целое слово, затем сверяйте выделение со словарём.','В обычное написание знак ударения не добавляется. Учебное выделение показываем отдельно, а в аудио передаём исходное слово.','cafea|кофе','mașină|машина','muzică|музыка'],
 ['stress-forms','Ударение при изменении формы','Форма слова может менять ударение: cafea → cafele. Не переносите разметку начальной формы на все формы автоматически. Сверяйте каждую форму отдельно.','Наши выделения основаны на подчёркнутой гласной словарной статьи DOOM³. Неизвестное ударение оставляем без разметки.','cafea|кофе','cafeaua|кофе с артиклем','cafele|порции кофе'],
 ['rhythm','От слова к ритму фразы','Произнесите фразу смысловыми группами. Выделяйте важное по смыслу слово, но сохраняйте словесные ударения. Сначала слушайте целое предложение, затем отдельные слова и снова целую фразу.','Подсветка отдельных слов здесь движется только при реальном запуске следующего аудиофрагмента, без приблизительных таймеров.','Bună ziua!|Добрый день!','Beau apă.|Я пью воду.','Învăț limba română.|Я изучаю румынский язык.'],
];
export const phoneticLessons:PhoneticLesson[]=lessonRows.map(([id,title,explanation,tip,...examples])=>({id,title,explanation,tip,examples:examples.map(x=>{const[ro,ru]=x.split('|');return{ro,ru};})}));
export const stressWords = stressData;
export const phoneticModes = [
 ['letter','Послушай букву — выбери её'],['sound','Послушай слово — найди его'],['syllable','Прочитай слог'],['build','Собери слово из букв'],['error','Найди неверное чтение'],['stress','Выбери ударный слог'],['dictation','Послушай и напиши слово'],['contrast','Различай похожие звуки'],['sentence','Прочитай предложение'],['shadow','Повтори за диктором'],['match','Сопоставь написание и звучание'],['phonetic-dictation','Фонетический диктант'],
] as const;
export type PhoneticMode=typeof phoneticModes[number][0];
export type PhoneticTask=Exercise&{mode:PhoneticMode;lessonId:string};
const uniqueWords=[...new Map(phoneticLessons.flatMap(l=>l.examples.map(e=>({...e,lessonId:l.id}))).map(e=>[e.ro,e])).values()];
const alternatives=(answer:string,all:string[])=>[answer,...all.filter(x=>x!==answer).slice(0,3)];
export const phoneticTasks:PhoneticTask[]=[
 ...alphabet.map((l):PhoneticTask=>({id:`phon:letter:${l.lower}`,mode:'letter',lessonId:'diacritics',kind:'choice',prompt:'Послушайте название буквы. Выберите её.',answer:l.upper,options:alternatives(l.upper,alphabet.map(a=>a.upper)),audio:l.nameAudio,why:`${l.upper} ${l.lower} — ${l.name}. ${l.explanation}`,skill:'listening',wordId:`phon:letter:${l.lower}`})),
 ...uniqueWords.flatMap((w):PhoneticTask[]=>[
  {id:`phon:sound:${w.ro}`,mode:'sound',lessonId:w.lessonId,kind:'choice',prompt:'Какое слово прозвучало?',answer:w.ro,options:alternatives(w.ro,uniqueWords.map(x=>x.ro)),audio:w.ro,why:`${w.ro} — ${w.ru}`,skill:'listening',wordId:`phon:word:${w.ro}`},
  {id:`phon:build:${w.ro}`,mode:'build',lessonId:w.lessonId,kind:'build',characterBuild:true,prompt:`Соберите слово: ${w.ru}`,answer:w.ro,audio:w.ro,why:`Правильное написание: ${w.ro}. Диакритические знаки обязательны.`,skill:'writing',wordId:`phon:word:${w.ro}`},
  {id:`phon:dictation:${w.ro}`,mode:'dictation',lessonId:w.lessonId,kind:'listen',prompt:'Послушайте и напишите слово.',answer:w.ro,audio:w.ro,why:`${w.ro} — ${w.ru}`,skill:'listening',wordId:`phon:word:${w.ro}`},
  {id:`phon:shadow:${w.ro}`,mode:'shadow',lessonId:w.lessonId,kind:'speech',prompt:'Повторите слово за диктором. Сравнивается распознанный текст, не акцент.',answer:w.ro,audio:w.ro,why:`${w.ro} — ${w.ru}. Сверьте произношение с эталоном на слух.`,skill:'speaking',wordId:`phon:word:${w.ro}`},
 ]),
 ...stressWords.map((w):PhoneticTask=>({id:`phon:stress:${w.word}`,mode:'stress',lessonId:'stress',kind:'choice',prompt:`Какой слог ударный в слове «${w.word}»? Учебное деление: ${w.syllables.join(' · ')}`,answer:`${w.stress+1}: ${w.syllables[w.stress]}`,options:w.syllables.map((s,i)=>`${i+1}: ${s}`),audio:w.word,why:`${w.word}: ударный слог ${w.stress+1}. Проверено по DOOM³: ${w.source}`,skill:'listening',wordId:`phon:word:${w.word}`})),
 ...['ma','mi','mu','pa','pi','pu','ta','ti','tu','la','li','lu','na','ni','nu','ra','ri','ru','sa','si','su','șa','și','șu','ța','ți','țu','ce','ci','che','chi','ge','gi','ghe','ghi'].map((s):PhoneticTask=>({id:`phon:syllable:${s}`,mode:'syllable',lessonId:'c',kind:'speech',prompt:`Прочитайте слог «${s}», прослушайте образец и сравните. Распознавание изолированных слогов может ошибаться.`,answer:s,audio:s,why:'Чтение слога — самопроверка по образцу. Распознавание текста не оценивает артикуляцию.',skill:'speaking',wordId:`phon:syllable:${s}`})),
 ...[
  ['casă','c: /k/','c: /tʃ/','Перед a буква c читается /k/.'],['cinema','c: /tʃ/','c: /k/','Перед i буква c читается /tʃ/.'],['cheie','ch: /k/','ch: /tʃ/','H сохраняет /k/ перед e.'],['gem','g: /dʒ/','g: /ɡ/','Перед e без h обычно /dʒ/.'],['ghem','gh: /ɡ/','gh: /dʒ/','H сохраняет /ɡ/ перед e.'],['joc','j: /ʒ/','j: /dʒ/','J — щелевой звук без смычки.'],['șase','ș: /ʃ/','ș: /s/','Ș и S — разные согласные.'],['țară','ț: /ts/','ț: /t/','Ț — слитная аффриката.'],['hotel','h: /h/','h: не звучит','В hotel h произносится.'],['elev','e: /e/','e: /je/','Начальное e здесь без /j/.'],['pomi','i: не отдельный слог','i: отдельный слог','Конечное i здесь показывает краткую палатализацию.'],['taxi','i: отдельный слог','i: не отдельный слог','В заимствовании taxi i слоговое.'],
 ].map(([word,good,bad,why]):PhoneticTask=>({id:`phon:error:${word}`,mode:'error',lessonId:'c',kind:'choice',prompt:`Какая запись НЕ соответствует слову «${word}»?`,answer:bad,options:[good,bad],audio:word,why,skill:'reading',wordId:`phon:word:${word}`})),
 ...[['sare','șase'],['casă','casa'],['gem','ghem'],['cer','cheie'],['joc','gem'],['țară','tare'],['apă','apa'],['pomi','pom']].flatMap(([a,b])=>[a,b].map((word):PhoneticTask=>({id:`phon:contrast:${a}:${b}:${word}`,mode:'contrast',lessonId:'diacritics',kind:'choice',prompt:'Какое из двух слов прозвучало? Слушайте начало и окончание.',answer:word,options:[a,b],audio:word,why:`Услышанное слово: ${word}. Сравните оба образца в уроке. Это контрастная пара, не обязательно минимальная.`,skill:'listening',wordId:`phon:word:${word}`}))),
 ...uniqueWords.slice(0,24).map((w):PhoneticTask=>({id:`phon:match:${w.ro}`,mode:'match',lessonId:w.lessonId,kind:'choice',prompt:'Сопоставьте звучание со значением.',answer:w.ru,options:alternatives(w.ru,uniqueWords.map(x=>x.ru)),audio:w.ro,why:`${w.ro} — ${w.ru}`,skill:'listening',wordId:`phon:word:${w.ro}`})),
 ...['Beau apă.','Am o carte.','Este o casă.','Învăț limba română.','Trenul pleacă din gară.','Aș dori o cafea, vă rog.','Mă numesc Ana.','Bună ziua!'].flatMap((text,i):PhoneticTask[]=>[
 {id:`phon:sentence:${i}`,mode:'sentence',lessonId:'rhythm',kind:'speech',prompt:'Прочитайте предложение и сравните с образцом. Оценка относится к тексту распознавания.',answer:text,audio:text,why:'Сохраняйте словесное ударение и делите фразу по смыслу.',skill:'speaking',wordId:`phon:sentence:${i}`},
 {id:`phon:phonetic-dictation:${i}`,mode:'phonetic-dictation',lessonId:'rhythm',kind:'listen',prompt:'Запишите всё предложение, сохраняя румынские буквы.',answer:text,audio:text,why:`Эталон: ${text}`,skill:'listening',wordId:`phon:sentence:${i}`},
 ]),
];
export const readingRoute=[
 {id:'letters',title:'Буквы',explanation:'Различайте название буквы и её звук в слове. Начните с пяти букв с диакритикой.',mode:'letter',fragments:['a','ă','î din a','șe','țe']},
 {id:'sounds',title:'Звуки',explanation:'Сравните c/ce/che и g/ge/ghe. Сначала прослушайте слово целиком.',mode:'contrast',fragments:['casă','cer','cheie','gară','gem','ghem']},
 {id:'syllables',title:'Слоги',explanation:'Прочитайте открытые слоги, затем соедините их. Слоговые записи синтезированы; сверяйте их с целыми словами.',mode:'syllable',fragments:['ma','sa','ca','să']},
 {id:'words',title:'Слова',explanation:'Учебное деление показывается отдельно. Не меняйте нормативное написание. Слушайте полное слово, затем его части.',mode:'build',fragments:['apă','casă','mașină','cafea']},
 {id:'sentences',title:'Предложения',explanation:'Сначала целая фраза, затем по словам. Подсветка следует за отдельными реальными MP3, а не за таймером.',mode:'sentence',fragments:['Eu','beau','apă.']},
 {id:'dialogues',title:'Диалоги',explanation:'Один собеседник спрашивает, другой отвечает. Прослушайте обе реплики и повторите одну роль.',mode:'sentence',fragments:['Bună ziua!','Aș dori o cafea, vă rog.','Cu lapte?','Da, mulțumesc.']},
 {id:'texts',title:'Тексты',explanation:'Прочитайте короткий связный текст. После прослушивания закройте текст и восстановите смысл: кто говорит, где живёт и что изучает?',mode:'phonetic-dictation',fragments:['Mă numesc Ana.','Locuiesc în București.','Învăț limba română.','În fiecare zi citesc o carte.']},
] as const;
export const phoneticAudioTexts=()=>[...new Set([...alphabet.flatMap(l=>[l.nameAudio,...l.examples.map(e=>e.ro)]),...phoneticLessons.flatMap(l=>l.examples.map(e=>e.ro)),...phoneticTasks.map(t=>t.audio!).filter(Boolean),...readingRoute.flatMap(r=>[...r.fragments]),...stressWords.flatMap(w=>[w.word,...w.syllables])])];
