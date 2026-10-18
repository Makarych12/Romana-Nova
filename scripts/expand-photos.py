#!/usr/bin/env python3
"""Exact bilingual entity photo enrichment; cached API responses and resumable local assets.
Never use search-result thumbnails. Require noun, exact Romanian Wikidata label/alias,
Russian label/alias matching a dictionary meaning, P18, photographic JPEG and free license.
Automatic candidates remain distinguishable from manually reviewed photos.
"""
import argparse, collections, concurrent.futures, threading, hashlib, html, io, json, re, time, unicodedata
from pathlib import Path
import requests
import urllib.parse
from PIL import Image, ImageOps, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path('/tmp/romana-photo-cache'); CACHE.mkdir(exist_ok=True)
UA={'User-Agent':'RomanaNovaEducationBot/1.0 (educational vocabulary; license attribution; local research)'}
NETWORK_LOCK=threading.Lock();NEXT_REQUEST=[0.]
def throttle():
 with NETWORK_LOCK:
  time.sleep(max(0,NEXT_REQUEST[0]-time.monotonic()));NEXT_REQUEST[0]=time.monotonic()+1.2
def atomic_json(path,data):
 temporary=path.with_suffix('.tmp.json');temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)
OUT=ROOT/'src/data/photo-enrichment.json'; PENDING=ROOT/'src/data/photo-review-pending.json'
def norm(x):
 x=re.sub(r'\([^)]*\)','',x).lower().replace('ё','е').strip()
 return unicodedata.normalize('NFC',x).replace('ş','ș').replace('ţ','ț')
def api(host,p):
 p={'format':'json',**p}; key=hashlib.sha256((host+json.dumps(p,sort_keys=True)).encode()).hexdigest(); f=CACHE/(key+'.json')
 if f.exists():return json.loads(f.read_text())
 for attempt in range(6):
  try:
   throttle();r=requests.get('https://'+host+'/w/api.php',params=p,headers=UA,timeout=65);r.raise_for_status();d=r.json()
   if 'error' in d:raise ValueError(d['error'])
   f.write_text(json.dumps(d,ensure_ascii=False));return d
  except Exception as error:
   if isinstance(error,requests.HTTPError) and error.response.status_code==429:
    delay=float(error.response.headers.get('Retry-After','10'));NEXT_REQUEST[0]=max(NEXT_REQUEST[0],time.monotonic()+delay);print('API rate-limited; pending batch; backoff',delay,flush=True);raise
   print('API retry',attempt+1,host,str(error)[:160],flush=True)
   if attempt==5:raise
   time.sleep(5+attempt*8)
def batches(xs,n=50):
 for i in range(0,len(xs),n):yield xs[i:i+n]
def strip(x):return html.unescape(re.sub('<[^>]+>',' ',x or '')).strip()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--vocabulary',default='/tmp/romana-tts/published-vocabulary.json');ap.add_argument('--limit',type=int,default=0);ap.add_argument('--workers',type=int,default=3);ap.add_argument('--no-sheets',action='store_true');ap.add_argument('--reuse-entities',action='store_true');ap.add_argument('--metadata-only',action='store_true');ap.add_argument('--cached-only',action='store_true');ap.add_argument('--method',choices=['wikipedia','sparql'],default='sparql');args=ap.parse_args()
 words=[w for w in json.loads(Path(args.vocabulary).read_text()) if not w.get('image') and ('существительное' in w['pos'] or 'сущ.' in w['pos']) and not re.search(r'имя|фамилия|топоним',w['pos']) and len(w['ro'])<70]
 if args.limit:words=words[:args.limit]
 # Wikipedia exact title resolution is only an index into Wikidata, never evidence alone.
 indexed={};errors=[]
 def resolve(chunk):
  titles=[w['ro'][0].upper()+w['ro'][1:] for w in chunk];d=api('ro.wikipedia.org',{'action':'query','titles':'|'.join(titles),'prop':'pageprops','redirects':1})
  mapping={x['from']:x['to'] for x in d['query'].get('normalized',[])+d['query'].get('redirects',[])}
  pages={p['title']:p for p in d['query']['pages'].values()}
  result={}
  for w,t in zip(chunk,titles):
   seen=set()
   while t in mapping and t not in seen:seen.add(t);t=mapping[t]
   p=pages.get(t,{})
   if 'disambiguation' not in p.get('pageprops',{}) and p.get('pageprops',{}).get('wikibase_item'):result[w['id']]=p['pageprops']['wikibase_item']
  return result
 entities={}
 if args.method=='sparql':
  def sparql(chunk):
   variants={v for w in chunk for v in [w['ro'],w['ro'][0].upper()+w['ro'][1:],w['ro'].replace('ș','ş').replace('ț','ţ')]}
   values=' '.join(json.dumps(v,ensure_ascii=False)+'@ro' for v in sorted(variants))
   query='SELECT ?item ?ro ?ru ?image WHERE { VALUES ?ro { '+values+' } ?item (rdfs:label|skos:altLabel) ?ro; (rdfs:label|skos:altLabel) ?ru; wdt:P18 ?image. FILTER(LANG(?ru)="ru") }'
   key=hashlib.sha256(query.encode()).hexdigest();path=CACHE/('sparql-'+key+'.json')
   if path.exists():return json.loads(path.read_text())
   for attempt in range(6):
    try:
     r=requests.get('https://query.wikidata.org/sparql',params={'query':query,'format':'json'},headers={**UA,'Accept':'application/sparql-results+json'},timeout=90);r.raise_for_status();d=r.json()['results']['bindings'];path.write_text(json.dumps(d,ensure_ascii=False));return d
    except Exception:
     if attempt==5:raise
     time.sleep(3+attempt*3)
  wordmap={norm(w['ro']):w for w in words};entity_matches={}
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
   rows_source=[sum((json.loads(f.read_text()) for f in CACHE.glob('sparql-*.json')),[])] if args.reuse_entities else pool.map(sparql,list(batches(words,100)))
   for i,rows in enumerate(rows_source):
    for row in rows:
     ro=row['ro']['value'];ru=row['ru']['value'];q=row['item']['value'].split('/')[-1];w=wordmap.get(norm(ro))
     if not w or norm(ru) not in {norm(x) for x in re.split(r'[;,]',w['ru'])}:continue
     title=urllib.parse.unquote(row['image']['value'].split('Special:FilePath/')[-1])
     entity_matches.setdefault(w['id'],set()).add(q);indexed[w['id']]=q;entities[q]={'labels':{'ro':{'value':ro},'ru':{'value':ru}},'claims':{'P18':[{'mainsnak':{'datavalue':{'value':title}}}]}}
    print('SPARQL exact matches',len(indexed),'processed',min((i+1)*100,len(words)),flush=True)
  indexed={k:v for k,v in indexed.items() if len(entity_matches[k])==1}
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
   for i,r in enumerate(pool.map(resolve,list(batches(words)))):
    indexed.update(r)
    if i%10==0:print('Indexed',min((i+1)*50,len(words)),'/',len(words),'entities',len(indexed),flush=True)
  entities={}
  def entity(chunk):return api('www.wikidata.org',{'action':'wbgetentities','ids':'|'.join(chunk),'props':'labels|aliases|claims','languages':'ro|ru'})['entities']
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
   for r in pool.map(entity,list(batches(sorted(set(indexed.values()))))):entities.update(r)
 candidates=[];rejected=[]
 for w in words:
  q=indexed.get(w['id']);e=entities.get(q,{})
  if not e:
   rejected.append({'id':w['id'],'ro':w['ro'],'reason':'no unique exact bilingual entity with P18'});continue
  labels=lambda lang:{norm(x['value']) for x in e.get('aliases',{}).get(lang,[])}|{norm(e.get('labels',{}).get(lang,{}).get('value',''))}
  ru={norm(x) for x in re.split(r'[;,]',w['ru'])}
  images=e.get('claims',{}).get('P18',[])
  if norm(w['ro']) not in labels('ro') or not ru&labels('ru') or not images:
   rejected.append({'id':w['id'],'ro':w['ro'],'reason':'bilingual entity labels do not match after disambiguation'});continue
  title=images[0].get('mainsnak',{}).get('datavalue',{}).get('value','')
  if re.search(r'execution|hanging|corpse|dead bod|murder victim|decapitat|torture|genital|penis|vulva|vagina|masturbat|intercourse|nude|nudity|naked',title,re.I):
   rejected.append({'id':w['id'],'ro':w['ro'],'file':title,'reason':'graphic or intimate image excluded'});continue
  # Raster JPEG only, prohibit common rendered/illustrated image types and descriptive hints.
  if not re.search(r'\.jpe?g$',title,re.I) or re.search(r'\b(map|diagram|drawing|illustration|painting|portrait|logo|coat of arms|stamp|icon|sketch|engraving|dessin|gravure|bandeira|flag)\b',title,re.I):
   rejected.append({'id':w['id'],'ro':w['ro'],'reason':'non-photographic or illustration filename','file':title});continue
  candidates.append((w,q,title))
 print('Exact bilingual photographic candidates',len(candidates),flush=True)
 infos={}
 for cached in CACHE.glob('*.json'):
  if cached.name.startswith('sparql-'):continue
  d=json.loads(cached.read_text())
  for p in d.get('query',{}).get('pages',{}).values():
   if p.get('imageinfo') and p['imageinfo'][0].get('thumburl'):infos[p['title'][5:]]=p['imageinfo'][0]
 print('Reusing metadata',len(infos),flush=True)
 def commons(chunk):
  try:d=api('commons.wikimedia.org',{'action':'query','titles':'|'.join('File:'+t for t in chunk),'prop':'imageinfo','iiprop':'url|extmetadata|size|mime','iiurlwidth':500})
  except Exception as error:
   print('Pending metadata batch',str(error)[:120],flush=True);return {}
  return {p['title'][5:]:p.get('imageinfo',[{}])[0] for p in d['query']['pages'].values()}
 titles=[] if args.cached_only else sorted({c[2] for c in candidates if c[2] not in infos})
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for i,r in enumerate(pool.map(commons,list(batches(titles,5)))):
   infos.update(r)
   if i%5==0:print('Commons metadata',len(infos),'remaining batches',max(0,(len(titles)+4)//5-i-1),flush=True)
 if args.metadata_only:return
 reviews_path=ROOT/'src/data/photo-visual-review.json';reviews=json.loads(reviews_path.read_text()) if reviews_path.exists() else {}
 published=json.loads(OUT.read_text()) if OUT.exists() else {}
 published={k:v for k,v in published.items() if reviews.get(k,{}).get('status')!='rejected'}
 for k,v in published.items():
  if reviews.get(k,{}).get('status')=='accepted':v['photoReview'].update({'visuallyReviewed':True,'visualReviewMethod':'contact-sheet-visual-review'})
 used={x['photoReview']['commonsFile'] for x in published.values()};pending=[]
 def download(c):
  w,q,title=c
  if reviews.get(w['id'],{}).get('status')=='rejected':return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'visual review rejected: '+reviews[w['id']].get('reason','')}}
  if w['id'] in published:return None
  z=infos.get(title,{})
  if not z:return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'individual metadata not yet available'}}
  m=z.get('extmetadata',{});get=lambda k:strip(m.get(k,{}).get('value',''))
  if re.search(r'execution|hanging|corpse|dead bod|murder victim|decapitat|torture|genital|penis|vulva|vagina|masturbat|intercourse|nude people|nudity|naked people',get('Categories'),re.I):return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'graphic or intimate category excluded'}}
  license=get('LicenseShortName');licenseurl=get('LicenseUrl');artist=get('Artist');desc=get('ImageDescription')
  if not licenseurl:
   match=re.search(r'(?:https?:)?//creativecommons\.org/(?:licenses|publicdomain)/[^\s\"<>]+',html.unescape(m.get('Permission',{}).get('value','')))
   if match:licenseurl='https:'+match.group(0) if match.group(0).startswith('//') else match.group(0)
  if not licenseurl and ('Public domain' in license or license.startswith('PD')):licenseurl='https://creativecommons.org/publicdomain/mark/1.0/'
  if not licenseurl:return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'missing individual license URL'}}
  if not re.match(r'^(CC BY(?:-SA)? [1-4]\.0|CC0|Public domain|PDM|PD)',license,re.I) or not artist or not z.get('thumburl') or z.get('mime')!='image/jpeg':return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'license, attribution or JPEG metadata not accepted','license':license}}
  if re.search(r'\b(illustration|drawing|engraving|painting|woodcut|diagram|computer.generated|3d.render|dessin|gravure|dessiné)\b',desc,re.I):return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'metadata suggests illustration'}}
  if z.get('width',0)<400 or z.get('height',0)<300:return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'insufficient source size'}}
  dest=ROOT/'public/photos/expanded'/(w['id']+'.webp')
  if not dest.exists():
   try:
    image_url=z['thumburl']
    r=requests.get(image_url,headers=UA,timeout=12)
    if r.status_code==429:return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'download rate limited 429','retryAfter':r.headers.get('Retry-After')}}
    if r.status_code!=200 or not r.headers.get('Content-Type','').startswith('image/'):
     # Small unscaled originals can be rate limited while a real resized derivative is available.
     width=max(240,min(500,z['width']-1))
     image_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+urllib.parse.quote(title,safe='')+'?width='+str(width)
     r=requests.get(image_url,headers=UA,timeout=12)
    r.raise_for_status();im=ImageOps.exif_transpose(Image.open(io.BytesIO(r.content))).convert('RGB');im.thumbnail((800,800));im.save(dest,'WEBP',quality=83,method=4)
   except Exception as e:return {'pending':{'id':w['id'],'ro':w['ro'],'file':title,'reason':'download error: '+str(e)[:160]}}
  return {'id':w['id'],'data':{'image':'/photos/expanded/'+dest.name,'imageSource':{'name':title,'url':z.get('descriptionurl','https://commons.wikimedia.org/wiki/File:'+title.replace(' ','_')),'license':license,'licenseUrl':licenseurl or ('https://creativecommons.org/publicdomain/mark/1.0/' if 'domain' in license.lower() else ''),'attribution':artist+'; уменьшено до 800 px, преобразовано в WebP.'},'photoReview':{'method':'exact-ro-ru-wikidata-labels-p18-commons-license','status':'automated-bilingual-match','visuallyReviewed':reviews.get(w['id'],{}).get('status')=='accepted','entity':q,'commonsFile':title,'roLabel':e_label(entities[q],'ro'),'ruLabel':e_label(entities[q],'ru'),'sourceWidth':z['width'],'sourceHeight':z['height'],'verifiedAt':'2026-10-17'}}}
 unique=[]
 for c in candidates:
  if c[2] in used:
   if c[0]['id'] not in published:rejected.append({'id':c[0]['id'],'ro':c[0]['ro'],'file':c[2],'reason':'same image already used for a different card'})
   continue
  used.add(c[2]);unique.append(c)
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  futures=[pool.submit(download,c) for c in unique]
  for i,future in enumerate(concurrent.futures.as_completed(futures)):
   r=future.result()
   if r and r.get('pending'):pending.append(r['pending'])
   elif r:published[r['id']]=r['data']
   if i%25==0:
    atomic_json(OUT,published);print('Photos',len(published),'processed',i,'/',len(unique),'pending',len(pending),flush=True)
 atomic_json(OUT,published);PENDING.write_text(json.dumps(pending+rejected,ensure_ascii=False,indent=2)+'\n')
 report={'nounCandidates':len(words),'wikipediaEntities':len(indexed),'exactBilingualCandidates':len(candidates),'downloadedPhotos':len(published),'manualVisualReviews':sum(x['photoReview'].get('visuallyReviewed',False) for x in published.values()),'pending':len(pending)+len(rejected),'rejectionReasons':dict(collections.Counter(x['reason'].split(':')[0] for x in pending+rejected)),'bytes':sum(p.stat().st_size for p in (ROOT/'public/photos/expanded').glob('*.webp'))}
 (ROOT/'src/data/photo-enrichment-stats.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
 if not args.no_sheets:contact_sheets(published,words)
def e_label(e,l):return e.get('labels',{}).get(l,{}).get('value','')
def contact_sheets(published,words,directory=None):
 directory=directory or ROOT/'artifacts/photo-review';directory.mkdir(parents=True,exist_ok=True);labels={w['id']:w for w in words};items=list(published.items())
 for offset in range(0,len(items),80):
  sheet=Image.new('RGB',(1200,1600),'white');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf',11)
  for j,(identifier,p) in enumerate(items[offset:offset+80]):
   x=(j%8)*150;y=(j//8)*160;im=Image.open(ROOT/'public'/p['image'].lstrip('/'));im.thumbnail((146,120));sheet.paste(im,(x,y));word=labels.get(identifier,{});draw.text((x+2,y+121),word.get('ro',identifier)[:23],fill='black',font=font);draw.text((x+2,y+136),str(offset+j+1)+': '+word.get('ru','')[:19],fill='black',font=font)
  sheet.save(directory/f'sheet-{offset//80+1:03}.jpg',quality=85)
if __name__=='__main__':main()
