"""Romanian adaptation of CHAMELEON BG's loopback Piper endpoint.
Reuses existing MP3 first; no package installation or automatic model download.
"""
import hashlib,io,json,os,re,subprocess,threading,unicodedata,wave
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
from piper.voice import PiperVoice
from piper.config import SynthesisConfig
import onnxruntime as ort

ROOT=Path(__file__).resolve().parents[1]
model=Path(os.environ['ROMANA_TTS_MODEL'])
config=json.loads(Path(str(model)+'.json').read_text())
if config.get('language',{}).get('code')!='ro_RO':raise RuntimeError('Only ro_RO Mihai is supported')
options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
from piper.voice import ESPEAK_DATA_DIR
from piper.config import PiperConfig
voice=PiperVoice(config=PiperConfig.from_dict(config),session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider']),espeak_data_dir=ESPEAK_DATA_DIR)
manifest=json.loads((ROOT/'src/data/audio-manifest.json').read_text())
canonical=lambda text:' '.join(unicodedata.normalize('NFC',text).split())
normalized={canonical(text).lower():url for text,url in manifest.items()}
# Keep generated cache out of the published library/manifest until editorial review.
cache=ROOT/'.local/tts/cache';cache.mkdir(parents=True,exist_ok=True)
lock=threading.Lock();slots=threading.BoundedSemaphore(2)
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  request=urlparse(self.path)
  if request.path=='/api/tts/health':
   data=json.dumps({'language':'ro-RO','voice':'Piper/Mihai'}).encode();self.reply(data,'application/json');return
  text=canonical(parse_qs(request.query).get('text',[''])[0])
  if request.path!='/api/tts' or not 1<=len(text)<=1000 or re.search('[А-Яа-яѝЍ]',text):self.send_error(400);return
  if not slots.acquire(blocking=False):self.send_error(503,'Piper busy');return
  try:
   self.connection.settimeout(20)
   existing=manifest.get(text) or normalized.get(text.lower())
   target=ROOT/('public'+existing) if existing else cache/(hashlib.sha256(text.encode()).hexdigest()[:24]+'.mp3')
   if not target.is_file():
    if not lock.acquire(timeout=2):self.send_error(503,'Piper busy');return
    try:
     if not target.is_file():
      pcm=io.BytesIO()
      with wave.open(pcm,'wb') as wav:voice.synthesize_wav(text,wav,syn_config=SynthesisConfig(length_scale=1.05))
      result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i','pipe:0','-codec:a','libmp3lame','-b:a','56k','-ar','22050','-ac','1','-f','mp3','pipe:1'],input=pcm.getvalue(),capture_output=True,timeout=20)
      if result.returncode or len(result.stdout)<500:raise RuntimeError('MP3 encoding failed')
      temporary=target.with_suffix('.tmp');temporary.write_bytes(result.stdout);temporary.replace(target)
    finally:lock.release()
   self.reply(target.read_bytes(),'audio/mpeg')
  except (BrokenPipeError,ConnectionResetError,TimeoutError):pass
  except Exception as error:print(type(error).__name__,flush=True);self.send_error(503,'Romanian speech unavailable')
  finally:slots.release()
 def reply(self,data,mime):
  self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.send_header('X-Speech-Language','ro-RO');self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
port=int(os.environ.get('ROMANA_TTS_PORT','8792'))
print(f'Romanian Piper/Mihai on 127.0.0.1:{port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
