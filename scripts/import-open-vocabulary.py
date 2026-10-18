#!/usr/bin/env python3
"""Rebuild attributed reference vocabulary; never invent translations/examples/CEFR.
Python 3 stdlib only. Downloads are cached outside the project by default.
Optional: pip install wordfreq, to rank pedagogical estimates by corpus frequency.
"""
import argparse, bz2, collections, hashlib, json, re, unicodedata, urllib.parse, urllib.request, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://kaikki.org/ruwiktionary/%D0%A0%D1%83%D0%BC%D1%8B%D0%BD%D1%81%D0%BA%D0%B8%D0%B9/kaikki.org-dictionary-%D0%A0%D1%83%D0%BC%D1%8B%D0%BD%D1%81%D0%BA%D0%B8%D0%B9.jsonl'
OPUS = 'https://object.pouta.csc.fi/OPUS-Tatoeba/v2023-04-12/moses/ro-ru.txt.zip'
BAD_EXAMPLES = {'Nu este marfă.', 'Unde pot găsi un ghid de conversație?', 'Am văzut o bătaie.', 'Ai cui sunt studentii?', 'Cine seamănă vânt va culege furtună.', 'Răsăritul se ridica și cădea din nou, și caii au obosit să galopeze prin stepe.', 'El a citit scrisorea încă o dată și a căzut pe gînduri.', 'Pe crengile pădurii un roi de păsărele cu-o lungă ciripire la soare se \'ncălzesc.'}
POS = {'noun':'существительное','verb':'глагол','adj':'прилагательное','adv':'наречие','prep':'предлог','pron':'местоимение','num':'числительное','conj':'союз','intj':'междометие','phrase':'выражение'}
THEMES = [
 ('Поезда',r'железнодорож|вагон|локомотив|перрон|вокзал|поезд|рельс'),
 ('Электроника',r'электрон|компьютер|программи|интернет|телефон|дисплей|информатик|робот|процессор|браузер'),
 ('Медицина',r'медицин|анатом|болезн|хирург|врач|больниц|здоров|лекарств|биолог|клетк|вирус'),
 ('Животные',r'животн|зоолог|птиц|насеком|рыб[аы]|млекопитающ|кошка|собака|змея|лошад|корова|свинья|овца|коз[аы]|курица|петух|кролик|медвед|волк|лис[аы]|голуб|вороб|ворон|мурав|бабочк|пчела|мух[аи]|паук'),
 ('Растения и природа',r'ботан|растен|дерев|цвет[оы]|природ|лес|геолог|минерал|эколог|гор[аы]|солнце|небо|река|озеро|море|земля'),
 ('Погода',r'метеорол|погод|температур|дожд|снег|туман|ветер|климат'),
 ('Еда',r'пищ|кулинар|блюд|фрукт|овощ|напит|хлеб|еда|молок|суп|мяс|сыр|кухн|вода|яблок|груша|слива|персик|абрикос|виноград|вишн|яйцо|сахар|соль|масло|картоф|помидор|огурец|капуст|кофе|чай|пиво|вино|тарелк|ложк|вилка|кастрюл'),
 ('Одежда',r'одежд|обув|ткан|костюм|рубашк|плать|шапк|брюк'),
 ('Семья',r'семь|родствен|отец|мать|брат|сестра|супруг|дочь|дед|бабуш'),
 ('Дом',r'мебел|домашн|жилищ|жилой|квартир|стул|стол|кровать|постель|ванн|дверь|окно|подушк|одеял|полотен|зеркал|ков[её]р|ламп|потолок|крыша|комнат'),
 ('Транспорт',r'транспорт|автомоб|авиац|самол[её]т|автобус|корабл|судоход|велосипед'),
 ('Город',r'город|улиц|здани|площадь|парк|мост|архитект'),
 ('Деньги',r'финанс|эконом|деньг|денеж|банков|монет|валют|капитал|бюджет|кредит'),
 ('Покупки',r'торгов|покуп|магазин|товар|продаж|цена|скидк'),
 ('Документы и учреждения',r'юрид|право|документ|администра|государств|закон|учрежден|полици|паспорт'),
 ('Работа и профессии',r'професси|работник|специалист|ремесл|производств|работа|должност|учител|инженер'),
 ('Эмоции',r'эмоци|чувств|психолог|радост|печал|страх|тревог|любов'),
 ('Путешествия',r'туризм|путешеств|гостиниц|отел|отдых|курорт'),
 ('Люди',r'человек|люди|личност|возраст|мужчин|женщин|реб[её]нок'),
 ('Техника и инструменты',r'техни|механ|инструмент|устройств|оборудован|машин|двигател|строител'),
 ('Наука и образование',r'наук|образован|математ|физик|хими|астроном|лингвист|философ|термин'),
]
TRANS = str.maketrans({'ş':'ș','ţ':'ț','Ş':'Ș','Ţ':'Ț'})
def norm(s): return unicodedata.normalize('NFC',s.translate(TRANS)).strip()
def fetch(url,path):
 if not path.exists():
  print('Downloading',url,flush=True)
  urllib.request.urlretrieve(url,path)
 return path

def provenance(word):
 return {'name':'Русский Викисловарь / Kaikki','url':'https://ru.wiktionary.org/wiki/'+urllib.parse.quote(word)+'#Румынский','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'Авторы статьи в русском Викисловаре; история правок доступна по ссылке источника. Извлечение: Kaikki / Wiktextract.'}
def theme(categories,translation,pos):
 text=(' '.join(categories)+' '+translation).lower()
 for title,pattern in THEMES:
  if re.search(r'(?<![а-яё])(?:' + pattern + ')',text):return title
 return 'Разговорная речь и выражения' if pos=='phrase' else 'Общая лексика'

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--cache',default='/tmp/romana-data');args=parser.parse_args()
 cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True)
 path=fetch(SOURCE,cache/'ruwiktionary-ro.jsonl')
 rejected=collections.Counter(); merged={}
 for line in path.open():
  raw=json.loads(line);word=norm(raw['word']);pos=raw.get('pos','')
  if pos not in POS:rejected['non_lexical_pos']+=1;continue
  if not word or not word[0].islower() or not re.fullmatch(r"[a-zăâîșțéüöàèùçäëïôûœáíóúžćńç'’ –-]+",word,re.I):rejected['name_or_invalid_headword']+=1;continue
  senses=[]
  for sense in raw.get('senses',[]):
   text=' '.join(sense.get('glosses',[]))
   if sense.get('form_of') or any(t in sense.get('tags',[]) for t in ['form-of','obsolete','archaic','no-gloss']):continue
   if re.search(r'\b(устар\.|диал\.|обл\.|архаич\.|форма мн|форма един|форма род|ошибочн)',text,re.I):continue
   if not re.search('[А-Яа-яёЁ]',text) or 'отсутствует пример' in text.lower():continue
   senses.append(sense)
  if not senses:rejected['no_usable_translation']+=1;continue
  key=word.casefold();entry=merged.setdefault(key,{'id':'open-'+hashlib.sha256(key.encode()).hexdigest()[:16],'ro':word,'ru':'','pos':POS[pos],'forms':'','theme':'','examples':[],'quality':'reference','levelEstimated':True,'source':provenance(raw['word']),'_gloss':[],'_categories':[],'_forms':[]})
  for sense in senses:
   for gloss in sense.get('glosses',[]):
    gloss=norm(gloss)
    if gloss not in entry['_gloss']:entry['_gloss'].append(gloss)
   for ex in sense.get('examples',[]):
    ro=norm(ex.get('text',''));ru=norm(ex.get('translation',''))
    if ro and ru and not re.search(r'[a-zăâșț]î[a-zăâșț]', re.sub(r'\b(?:re|ne)î', '', ro.lower())) and ro not in BAD_EXAMPLES and re.search('[А-Яа-я]',ru) and not any(e['ro']==ro for e in entry['examples']):entry['examples'].append({'ro':ro,'ru':ru,'source':entry['source']})
  cats=[x['name'] for x in raw.get('categories',[])];entry['_categories'].extend(cats)
  for f in raw.get('forms',[]):
   form=norm(f.get('form',''))
   if form and form!='-' and form!=word and form not in entry['_forms']:entry['_forms'].append(form)
  for gender,label in [('Мужской род','м. р.'),('Женский род','ж. р.'),('Средний род','ср. р.')]:
   if any(gender in c for c in cats) and label not in entry['pos']:entry['pos']+=', '+label
 entries=list(merged.values())
 # Rank estimated bands using Romanian sentence frequency only: this is NOT a CEFR source.
 counts=collections.Counter()
 ron=fetch('https://downloads.tatoeba.org/exports/per_language/ron/ron_sentences_detailed.tsv.bz2',cache/'ron_sentences_detailed.tsv.bz2')
 authors={}
 with bz2.open(ron,'rt') as inp:
  for line in inp:
   row=line.rstrip('\n').split('\t')
   if len(row)<4:continue
   authors[row[0]]=row[3]
   counts.update(re.findall(r'[a-zăâîșț]+',norm(row[2]).lower()))
 try:
  from wordfreq import zipf_frequency
  rank=lambda e:(-zipf_frequency(e['ro'],'ro'),-counts[e['ro']],e['ro'])
  rank_source='wordfreq Romanian frequency + Tatoeba; estimated bands, not validated CEFR'
 except ImportError:
  rank=lambda e:(-min(counts[t] for t in e['ro'].split()) / (1 + 0.15 * (len(e['ro'].split()) - 1)),e['ro'])
  rank_source='Tatoeba Romanian token frequencies; estimated bands, not validated CEFR'
 entries.sort(key=rank)
 # Join only direct aligned sentence pairs, never pivot through a third language.
 archive=fetch(OPUS,cache/'ro-ru.zip');example_pairs=[]
 with zipfile.ZipFile(archive) as z:
  ro=z.read('Tatoeba.ro-ru.ro').decode().splitlines();ru=z.read('Tatoeba.ro-ru.ru').decode().splitlines()
  ids=re.findall(r'xtargets="(\d+);(\d+)"',z.read('Tatoeba.ro-ru.xml').decode())
  # Some XML links contain split IDs; align line-by-line first, then reject those links.
  links=re.findall(r'xtargets="([^"]+)"',z.read('Tatoeba.ro-ru.xml').decode())
  for r,t,link in zip(ro,ru,links):
   pair=link.split(';')
   if len(pair)!=2 or not all(x.isdigit() for x in pair):continue
   if norm(r) in BAD_EXAMPLES:continue
   example_pairs.append({'ro':norm(r),'ru':norm(t),'roId':pair[0],'ruId':pair[1]})
 rus=cache/'rus_sentences_detailed.tsv.bz2';ru_authors={}
 if rus.exists():
  wanted={p['ruId'] for p in example_pairs}
  try:
   with bz2.open(rus,'rt') as inp:
    for line in inp:
     row=line.rstrip('\n').split('\t')
     if row[0] in wanted and len(row)>3:ru_authors[row[0]]=row[3]
  except (EOFError,OSError):ru_authors={}
 index=collections.defaultdict(list)
 for p in example_pairs:
  p['source']={'name':'Tatoeba / OPUS','url':'https://tatoeba.org/en/sentences/show/'+p['roId'],'translationUrl':'https://tatoeba.org/en/sentences/show/'+p['ruId'],'license':'CC BY 2.0 FR','licenseUrl':'https://creativecommons.org/licenses/by/2.0/fr/','attribution':f"Tatoeba: {authors.get(p['roId']) or 'contributors'} (RO), {ru_authors.get(p['ruId']) or 'contributors'} (RU); OPUS v2023-04-12"}
  for tok in set(re.findall(r'[a-zăâîșț]+',p['ro'].lower())):index[tok].append(p)
 bands=[('A0',300),('A1',900),('A2',1200),('B1',1400),('B2',1300),('C1',10**9)]
 for i,e in enumerate(entries):
  e['ru']='; '.join(e.pop('_gloss'))
  e['theme']=theme(e.pop('_categories'),e['ru'],'phrase' if 'выражение' in e['pos'] else '')
  e['forms']='; '.join(e.pop('_forms'))
  n=i
  for lev,size in bands:
   if n<size:e['level']=lev;break
   n-=size
  for p in index.get(e['ro'],[]):
   if len(e['examples'])>=2:break
   if p['ro'] not in [x['ro'] for x in e['examples']]:e['examples'].append({k:p[k] for k in ['ro','ru','source']})
 out=ROOT/'src/data/imported-vocabulary.json'
 out.write_text(json.dumps(entries,ensure_ascii=False,separators=(',',':'))+'\n')
 stats={'entries':len(entries),'distinctHeadwords':len({e['ro'].casefold() for e in entries}),'examples':sum(len(e['examples']) for e in entries),'withTwoExamples':sum(len(e['examples'])>=2 for e in entries),'withForms':sum(bool(e['forms']) for e in entries),'estimatedLevels':dict(collections.Counter(e['level'] for e in entries)),'themes':dict(collections.Counter(e['theme'] for e in entries)),'rejected':dict(rejected),'ranking':rank_source,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source':SOURCE,'sourceSnapshot':'ruwiktionary 2026-10-01 via Kaikki 2026-10-02','tatoebaDirectPairs':len(example_pairs),'quality':'reference; CEFR bands estimated, translations and examples imported rather than individually reviewed'}
 (ROOT/'src/data/imported-vocabulary-stats.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'src/data/imported-examples.json').write_text(json.dumps(example_pairs,ensure_ascii=False,separators=(',',':'))+'\n')
 (ROOT/'public/licenses').mkdir(exist_ok=True,parents=True)
 with zipfile.ZipFile(archive) as z:(ROOT/'public/licenses/tatoeba-cc-by-2-fr.txt').write_bytes(z.read('LICENSE'))
 print(json.dumps(stats,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
