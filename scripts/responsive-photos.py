"""Adapt CHAMELEON BG responsive-photos.py to existing Romanian card IDs.
Creates derivatives only; original photographs and license metadata are preserved.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageOps
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/'src/data/catalog-meta.json').read_text())
words=json.loads((ROOT/('public'+meta['url'])).read_text())
photos=sorted({w['image'] for w in words if w.get('image')})
out=ROOT/'public/photos/responsive';out.mkdir(exist_ok=True)
def convert(src):
 source=ROOT/('public'+src);name=hashlib.sha256(src.encode()).hexdigest()[:16];variants=[]
 with Image.open(source) as opened:
  original=ImageOps.exif_transpose(opened).convert('RGB')
  for width in (320,640):
   target=out/(name+f'-{width}.webp')
   if not target.exists() or target.stat().st_mtime<source.stat().st_mtime:
    image=original.copy();image.thumbnail((width,width*original.height//original.width));image.save(target,'WEBP',quality=82,method=4)
   with Image.open(target) as image:variants.append({'url':'/photos/responsive/'+target.name,'width':image.width,'bytes':target.stat().st_size})
  return src,{'width':original.width,'height':original.height,'variants':variants},source.stat().st_size
with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(convert,photos))
(ROOT/'src/data/responsive-photos.json').write_text(json.dumps({src:data for src,data,size in rows},ensure_ascii=False,separators=(',',':'))+'\n')
report={'photos':len(rows),'variants':sum(len(data['variants']) for src,data,size in rows),'originalBytes':sum(size for src,data,size in rows),'webp320Bytes':sum(data['variants'][0]['bytes'] for src,data,size in rows),'webp640Bytes':sum(data['variants'][1]['bytes'] for src,data,size in rows),'originalFilesPreserved':True,'browserRenderingVerified':False}
(ROOT/'quality/responsive-photo-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
