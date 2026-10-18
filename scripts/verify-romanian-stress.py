"""Check manually segmented words against DOOM3's underlined headword vowel.
Never infer stress from spelling, TTS or frequency. Cache source in ignored .local.
"""
import concurrent.futures,html,json,re,urllib.request,urllib.parse
from pathlib import Path
rows='''apă|вода|a-pă
casă|дом|ca-să
masă|стол|ma-să
cafea|кофе|ca-fea
cafeaua|кофе с артиклем|ca-fea-ua
cafele|порции кофе|ca-fe-le
mașină|автомобиль|ma-și-nă
pâine|хлеб|pâi-ne
mână|рука|mâ-nă
țară|страна|ța-ră
școală|школа|școa-lă
carte|книга|car-te
copil|ребёнок|co-pil
copii|дети|co-pii
pisică|кошка|pi-si-că
câine|собака|câi-ne
fereastră|окно|fe-reas-tră
ușă|дверь|u-șă
gară|вокзал|ga-ră
trenul|поезд с артиклем|tre-nul
bilet|билет|bi-let
oraș|город|o-raș
stradă|улица|stra-dă
familie|семья|fa-mi-li-e
prieten|друг|pri-e-ten
limbă|язык|lim-bă
română|румынская|ro-mâ-nă
România|Румыния|Ro-mâ-ni-a
dimineață|утро|di-mi-nea-ță
seară|вечер|sea-ră
noapte|ночь|noap-te
mâncare|еда|mân-ca-re
legume|овощи|le-gu-me
fructe|фрукты|fruc-te
lapte|молоко|lap-te
zahăr|сахар|za-hăr
brânză|сыр|brân-ză
grădină|сад|gră-di-nă
floare|цветок|floa-re
pădure|лес|pă-du-re
munte|гора|mun-te
soare|солнце|soa-re
vreme|погода|vre-me
medic|врач|me-dic
spital|больница|spi-tal
farmacie|аптека|far-ma-ci-e
hotel|гостиница|ho-tel
cameră|комната|ca-me-ră
telefon|телефон|te-le-fon
magazin|магазин|ma-ga-zin
serviciu|работа, служба|ser-vi-ciu
lucru|дело, работа|lu-cru
vacanță|каникулы|va-can-ță
întrebare|вопрос|în-tre-ba-re
răspuns|ответ|răs-puns
profesor|учитель|pro-fe-sor
student|студент|stu-dent
muzică|музыка|mu-zi-că
repede|быстро|re-pe-de
încet|медленно|în-cet
frumos|красивый|fru-mos
bine|хорошо|bi-ne
cinema|кинотеатр|ci-ne-ma
cheie|ключ|che-ie
gheață|лёд|ghea-ță
ghindă|жёлудь|ghin-dă'''
cache=Path('.local/doom-stress');cache.mkdir(parents=True,exist_ok=True)
def check(row):
 word,ru,split=row.split('|');query='cafea' if word in ['cafeaua','cafele'] else word;url='https://doom.lingv.ro/cautare/q/'+urllib.parse.quote(query)
 file=cache/(query+'.html')
 if not file.exists():
  file.write_bytes(urllib.request.urlopen(url,timeout=25).read())
 page=file.read_text();entries=re.findall(r'<entry\b[\s\S]*?</entry>',page)
 for entry in entries:
  if word=='copil' and '(reg.)' in entry:continue
  m=re.search(r'<span[^>]*font-weight: bold[^>]*>([\s\S]*?)</span>(?:</span>)?',entry)
  # The first bold span contains one nested span for the stressed vowel.
  pattern=r'<span[^>]*'+('font-style: italic;' if word in ['cafeaua','cafele'] else 'font-weight: bold')+r'[^>]*>((?:[^<]|<span[^>]*>[^<]*</span>|<sup[^>]*>[^<]*</sup>)*)</span>'
  candidates=list(re.finditer(pattern,entry))
  full=next((m for m in candidates if html.unescape(re.sub('<[^>]*>','',re.sub(r'<sup[^>]*>[\s\S]*?</sup>','',m.group(1)))).strip()==word),None)
  if not full:continue
  raw=full.group(1);plain=html.unescape(re.sub('<[^>]*>','',re.sub(r'<sup[^>]*>[\s\S]*?</sup>','',raw))).strip()
  if plain!=word:continue
  under=re.search(r'<span[^>]*text-decoration:underline[^>]*>([^<]+)</span>',raw)
  if not under:continue
  before=html.unescape(re.sub('<[^>]*>','',raw[:under.start()]));offset=len(before)
  syllables=split.split('-');assert ''.join(syllables)==word
  stress=None;total=0
  for i,s in enumerate(syllables):
   if total<=offset<total+len(s):stress=i
   total+=len(s)
  return dict(word=word,ru=ru,syllables=syllables,stress=stress,stressOffset=offset,source=url,checked='2026-10-18',method='DOOM3 underlined headword vowel; manual syllable segmentation')
 return dict(word=word,error='No exact marked headword; excluded, never guessed',source=url)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(check,rows.splitlines()))
accepted=[r for r in results if 'error' not in r]
Path('src/data/academy/stress.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2)+'\n')
Path('quality/stress-source-verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('Verified',len(accepted),'Excluded',len(results)-len(accepted));print([r['word'] for r in results if 'error'in r])
