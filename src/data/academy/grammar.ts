import type {Exercise} from '../../lib/exercises.ts';
import type {Level} from '../course.ts';
export const grammarSources=[{name:'DOOM³ · Формы глаголов',url:'https://doom.lingv.ro/studiu_introductiv/observatii_recomandari'},{name:'DOOM³ · Словарные формы',url:'https://doom.lingv.ro/'}];
export type Verb={infinitive:string;ru:string;present:string[];imperfect:string[];participle:string;subjunctive:string[];source:string};
const rows=[
 ['fi','быть','sunt ești este suntem sunteți sunt','eram erai era eram erați erau','fost','fiu fii fie fim fiți fie'],
 ['avea','иметь','am ai are avem aveți au','aveam aveai avea aveam aveați aveau','avut','am ai aibă avem aveți aibă'],
 ['merge','идти','merg mergi merge mergem mergeți merg','mergeam mergeai mergea mergeam mergeați mergeau','mers','merg mergi meargă mergem mergeți meargă'],
 ['face','делать','fac faci face facem faceți fac','făceam făceai făcea făceam făceați făceau','făcut','fac faci facă facem faceți facă'],
 ['veni','приходить','vin vii vine venim veniți vin','veneam veneai venea veneam veneați veneau','venit','vin vii vină venim veniți vină'],
 ['ști','знать','știu știi știe știm știți știu','știam știai știa știam știați știau','știut','știu știi știe știm știți știe'],
 ['da','давать','dau dai dă dăm dați dau','dădeam dădeai dădea dădeam dădeați dădeau','dat','dau dai dea dăm dați dea'],
 ['lua','брать','iau iei ia luăm luați iau','luam luai lua luam luați luau','luat','iau iei ia luăm luați ia'],
 ['sta','стоять, находиться','stau stai stă stăm stați stau','stăteam stăteai stătea stăteam stăteați stăteau','stat','stau stai stea stăm stați stea'],
 ['bea','пить','beau bei bea bem beți beau','beam beai bea beam beați beau','băut','beau bei bea bem beți bea'],
 ['mânca','есть','mănânc mănânci mănâncă mâncăm mâncați mănâncă','mâncam mâncai mânca mâncam mâncați mâncau','mâncat','mănânc mănânci mănânce mâncăm mâncați mănânce'],
 ['dormi','спать','dorm dormi doarme dormim dormiți dorm','dormeam dormeai dormea dormeam dormeați dormeau','dormit','dorm dormi doarmă dormim dormiți doarmă'],
 ['scrie','писать','scriu scrii scrie scriem scrieți scriu','scriam scriai scria scriam scriați scriau','scris','scriu scrii scrie scriem scrieți scrie'],
 ['citi','читать','citesc citești citește citim citiți citesc','citeam citeai citea citeam citeați citeau','citit','citesc citești citească citim citiți citească'],
 ['vorbi','говорить','vorbesc vorbești vorbește vorbim vorbiți vorbesc','vorbeam vorbeai vorbea vorbeam vorbeați vorbeau','vorbit','vorbesc vorbești vorbească vorbim vorbiți vorbească'],
 ['lucra','работать','lucrez lucrezi lucrează lucrăm lucrați lucrează','lucram lucrai lucra lucram lucrați lucrau','lucrat','lucrez lucrezi lucreze lucrăm lucrați lucreze'],
 ['învăța','учить','învăț înveți învață învățăm învățați învață','învățam învățai învăța învățam învățați învățau','învățat','învăț înveți învețe învățăm învățați învețe'],
 ['asculta','слушать','ascult asculți ascultă ascultăm ascultați ascultă','ascultam ascultai asculta ascultam ascultați ascultau','ascultat','ascult asculți asculte ascultăm ascultați asculte'],
 ['vedea','видеть','văd vezi vede vedem vedeți văd','vedeam vedeai vedea vedeam vedeați vedeau','văzut','văd vezi vadă vedem vedeți vadă'],
 ['putea','мочь','pot poți poate putem puteți pot','puteam puteai putea puteam puteați puteau','putut','pot poți poată putem puteți poată'],
 ['vrea','хотеть','vreau vrei vrea vrem vreți vor','voiam voiai voia voiam voiați voiau','vrut','vreau vrei vrea vrem vreți vrea'],
 ['pleca','уезжать','plec pleci pleacă plecăm plecați pleacă','plecam plecai pleca plecam plecați plecau','plecat','plec pleci plece plecăm plecați plece'],
 ['ajunge','прибывать','ajung ajungi ajunge ajungem ajungeți ajung','ajungeam ajungeai ajungea ajungeam ajungeați ajungeau','ajuns','ajung ajungi ajungă ajungem ajungeți ajungă'],
 ['deschide','открывать','deschid deschizi deschide deschidem deschideți deschid','deschideam deschideai deschidea deschideam deschideați deschideau','deschis','deschid deschizi deschidă deschidem deschideți deschidă'],
 ['închide','закрывать','închid închizi închide închidem închideți închid','închideam închideai închidea închideam închideați închideau','închis','închid închizi închidă închidem închideți închidă'],
 ['cumpăra','покупать','cumpăr cumperi cumpără cumpărăm cumpărați cumpără','cumpăram cumpărai cumpăra cumpăram cumpărați cumpărau','cumpărat','cumpăr cumperi cumpere cumpărăm cumpărați cumpere'],
 ['aștepta','ждать','aștept aștepți așteaptă așteptăm așteptați așteaptă','așteptam așteptai aștepta așteptam așteptați așteptau','așteptat','aștept aștepți aștepte așteptăm așteptați aștepte'],
 ['găsi','находить','găsesc găsești găsește găsim găsiți găsesc','găseam găseai găsea găseam găseați găseau','găsit','găsesc găsești găsească găsim găsiți găsească'],
 ['primi','получать','primesc primești primește primim primiți primesc','primeam primeai primea primeam primeați primeau','primit','primesc primești primească primim primiți primească'],
 ['trimite','отправлять','trimit trimiți trimite trimitem trimiteți trimit','trimiteam trimiteai trimitea trimiteam trimiteați trimiteau','trimis','trimit trimiți trimită trimitem trimiteți trimită'],
];
export const verbs:Verb[]=rows.map(([infinitive,ru,present,imperfect,participle,subjunctive])=>({infinitive,ru,present:present.split(' '),imperfect:imperfect.split(' '),participle,subjunctive:subjunctive.split(' '),source:'https://doom.lingv.ro/cautare/q/'+encodeURIComponent(infinitive)}));
export const persons=['eu','tu','el/ea','noi','voi','ei/ele'];
export const tenseNames=['Prezent','Perfect compus','Imperfect','Viitor','Conjunctiv prezent','Condițional prezent'] as const;
export function verbForms(v:Verb,tense:string){
 switch(tense){
  case 'Prezent':return v.present;
  case 'Perfect compus':return ['am','ai','a','am','ați','au'].map(a=>`${a} ${v.participle}`);
  case 'Imperfect':return v.imperfect;
  case 'Viitor':return ['voi','vei','va','vom','veți','vor'].map(a=>`${a} ${v.infinitive}`);
  case 'Conjunctiv prezent':return v.subjunctive.map(f=>`să ${f}`);
  case 'Condițional prezent':return ['aș','ai','ar','am','ați','ar'].map(a=>`${a} ${v.infinitive}`);
  default:throw Error('Unknown tense');
 }
}
export type GrammarTask=Exercise&{theme:string;level:Level;mechanic:string};
const tenseLevels:Level[]=['A1','A2','A2','A2','B1','B1'];
export const grammarTasks:GrammarTask[]=verbs.flatMap(v=>tenseNames.flatMap((tense,t)=>verbForms(v,tense).map((answer,i)=>({id:`academy:grammar:verb:${v.infinitive}:${t}:${i}`,theme:tense,level:tenseLevels[t],mechanic:'Спряжение',kind:'input' as const,prompt:`a ${v.infinitive} (${v.ru}) · ${tense} · ${persons[i]} → …`,answer,audio:answer,why:`${persons[i]} ${answer}. ${tense}. Инфинитив: a ${v.infinitive}. Формы: ${verbForms(v,tense).join('; ')}.`,skill:'writing' as const,wordId:`academy:verb:${v.infinitive}`}))));
const contrastRows=[
 ['Eu ___ acum, dar ieri am lucrat acasă.','lucrez','lucram','Настоящее действие противопоставлено завершённому вчера.'],
 ['Când eram copil, ___ zilnic în parc.','mergeam','am mers','Imperfect описывает привычное действие в прошлом.'],
 ['Ieri ___ o scrisoare și am trimis-o imediat.','am scris','scriam','Два завершённых последовательных действия — perfect compus.'],
 ['În timp ce ___, a sunat telefonul.','citeam','am citit','Imperfect — фоновое действие, perfect compus — событие на его фоне.'],
 ['Mâine ___ la București.','voi merge','am mers','Mâine указывает на будущее.'],
 ['Vreau ___ mai bine românește.','să vorbesc','vorbesc','После vreau используется conjunctiv с să.'],
 ['Dacă aș avea timp, ___ mai mult.','aș citi','voi citi','Гипотетическое условие — condițional prezent.'],
 ['Nu știu dacă el ___ mâine.','va veni','a venit','Здесь dacă вводит косвенный вопрос о будущем, а не условие.'],
];
contrastRows.forEach(([prompt,answer,other,why],i)=>grammarTasks.push({id:`academy:grammar:contrast:${i}`,theme:'Различение времён',level:i>4?'B1':'A2',mechanic:'Определи время',kind:'choice',prompt,answer,options:[answer,other],audio:prompt.replace('___',answer),why,skill:'reading',wordId:`academy:grammar:contrast:${i}`}));
const contextual:[string,Level,string,string,string][]=[
 ['Род и число','A0','Один мальчик: ___ băiat','un','Băiat — мужской род: un băiat, doi băieți.'],
 ['Род и число','A0','Одна девочка: ___ fată','o','Fată — женский род: o fată, două fete.'],
 ['Род и число','A1','Два поезда: ___ trenuri','două','Средний род: un tren, două trenuri.'],
 ['Род и число','A1','Два мальчика: ___ băieți','doi','Для мужского рода — doi.'],
 ['Род и число','A1','Множественное число carte → …','cărți','O carte — două cărți.'],
 ['Артикли','A1','Определённая форма casă → …','casa','Конечное ă переходит в a: o casă → casa.'],
 ['Артикли','A1','Определённая форма băiat → …','băiatul','Определённый артикль мужского рода -ul.'],
 ['Артикли','A1','Определённая форма cărți → …','cărțile','Множественный артикль -le: cărțile.'],
 ['Артикли','A1','Определённая форма oameni → …','oamenii','Oameni + определённый артикль i: oamenii.'],
 ['Падежи','A2','Книга девочки: cartea ___ (fata)','fetei','Родительный/дательный определённой формы fată: fetei.'],
 ['Падежи','A2','Даю ребёнку книгу: Îi dau ___ o carte. (copilul)','copilului','Copilului — дательный ед. числа с артиклем.'],
 ['Падежи','B1','Книги детей: cărțile ___ (copiii)','copiilor','Родительный множественного числа: copiilor.'],
 ['Падежи','B1','Книга одной студентки: cartea ___ studente','unei','Неопределённый артикль ж. р. род./дат.: unei.'],
 ['Местоимения','A1','Я из Румынии: ___ sunt din România.','Eu','Eu — я. В ответе тренируем местоимение явно.'],
 ['Местоимения','A2','Я вижу его: ___ văd.','Îl','Îl — безударная форма прямого дополнения мужского рода.'],
 ['Местоимения','A2','Я вижу её: ___ văd.','O','O — форма прямого дополнения женского рода.'],
 ['Местоимения','B1','Я даю ей книгу: ___ dau o carte.','Îi','Îi — безударное косвенное дополнение ед. числа.'],
 ['Местоимения','B1','Я ему её даю: I-___ dau.','o','Сочетание дательного и винительного: i-o dau.'],
 ['Отрицание','A1','Я не понимаю: ___ înțeleg.','Nu','Nu ставится перед личной формой глагола.'],
 ['Отрицание','A2','Никто не пришёл: Nimeni ___ a venit.','nu','В румынском требуется согласование отрицаний.'],
 ['Отрицание','A2','Я ничего не вижу: Nu văd ___.','nimic','Nimic — ничего; отрицание nu сохраняется.'],
 ['Повелительное','A2','Скажи «Приходи!» одному знакомому (a veni).','Vino!','Неправильное повелительное: vino!'],
 ['Повелительное','A2','Скажи «Сделай!» одному знакомому (a face).','Fă!','Неправильное повелительное: fă!'],
 ['Повелительное','A2','Скажи «Скажи!» одному знакомому (a zice).','Zi!','Неправильное повелительное: zi!'],
 ['Повелительное','A2','Скажи «Не уходи!» одному знакомому (a pleca).','Nu pleca!','Отрицательная форма ед. числа: nu + инфинитив без a.'],
 ['Повелительное','A2','Скажи «Не делай!» одному знакомому (a face).','Nu face!','Отрицательное повелительное: nu face, не nu fă.'],
 ['Согласование','A1','Красивая девушка: o fată ___ (frumos)','frumoasă','Прилагательное согласуется с существительным женского рода.'],
 ['Согласование','A1','Красивые девушки: fete ___ (frumos)','frumoase','Женский род множественного числа: frumoase.'],
 ['Согласование','A1','Новые поезда: trenuri ___ (nou)','noi','Средний род во множественном числе согласуется как женский.'],
 ['Сложные предложения','B1','Хочу, чтобы он пришёл: Vreau ___ vină.','să','Conjunctiv вводится частицей să.'],
 ['Сложные предложения','B1','Остаюсь дома, потому что идёт дождь: Rămân acasă ___ plouă.','fiindcă','Fiindcă вводит причину.'],
 ['Сложные предложения','B2','Хотя дождь, мы выходим: ___ plouă, ieșim.','Deși','Deși вводит уступку с изъявительным наклонением.'],
 ['Сложные предложения','B2','Книга, которую я прочёл: cartea ___ am citit-o','pe care','Прямое относительное дополнение требует pe care и дублирующего o.'],
 ['Сложные предложения','B2','Человек, которому я написал: omul ___ i-am scris','căruia','Căruia — дат. форма относительного местоимения мужского рода.'],
 ['Сложные предложения','B2','Если бы я знал, я бы пришёл: Dacă aș fi știut, ___ venit.','aș fi','Нереальное условие в прошлом: condițional perfect.'],
 ['Сложные предложения','B2','Он сказал, что придёт: A spus ___ va veni.','că','Косвенная речь не требует механического сдвига всех времён.'],
 ['Сложные предложения','C1','Вопреки ожиданиям, он пришёл: ___ așteptărilor, a venit.','Contrar','Contrar управляет дательным: așteptărilor.'],
 ['Сложные предложения','C1','По мере того как данные уточняются: Pe ___ ce datele se clarifică','măsură','Pe măsură ce выражает постепенное параллельное изменение.'],
 ['Сложные предложения','C1','Он действует так, будто всё знает: Se poartă ca și cum ___ totul.','ar ști','Ca și cum вводит нереальное сравнение с condițional.'],
 ['Сложные предложения','C1','Как бы он ни старался: Oricât ___ încerca','ar','Oricât + condițional выражает уступку при гипотетическом условии.'],
 ['Сложные предложения','C1','Данные, достоверность которых проверена: datele ___ exactitate a fost verificată','a căror','A согласуется с exactitate (ж. ед.), căror относится к datele (мн.).'],
 ['Сложные предложения','C1','Если бы не его помощь: Dacă nu ___ fost ajutorul lui','ar fi','Condițional perfect — ar fi fost.'],
];
contextual.forEach(([theme,level,prompt,answer,why],i)=>grammarTasks.push({id:`academy:grammar:context:${i}`,theme,level,mechanic:theme==='Повелительное'?'Исправь форму':'Заполни пропуск',kind:'input',prompt,answer,why,skill:'writing',wordId:`academy:grammar:context:${i}`}));
export const grammarAudioTexts=()=>[...new Set(grammarTasks.map(t=>t.audio).filter((x):x is string=>!!x))];
