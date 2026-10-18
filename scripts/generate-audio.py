#!/usr/bin/env python3
"""Reproducible Romanian MP3 generation. Requires piper-tts + ffmpeg.
Voice MODEL_CARD: public/licenses/ro_RO-mihai-MODEL_CARD.txt (CC0 dataset).
Run collect-audio-texts.mjs first. Existing content-addressed files are reused.
"""
import argparse,concurrent.futures,hashlib,json,os,time,wave,io,subprocess
from pathlib import Path
import numpy as np
import onnxruntime as ort
from piper.voice import PiperVoice,ESPEAK_DATA_DIR
from piper.config import PiperConfig,SynthesisConfig
voice=None
overrides=json.loads(Path("src/data/academy/pronunciation-overrides.json").read_text()) if Path("src/data/academy/pronunciation-overrides.json").exists() else {}

def init(model):
 global voice
 options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
 voice=PiperVoice(config=PiperConfig.from_dict(json.loads(Path(model+'.json').read_text())),session=ort.InferenceSession(model,sess_options=options,providers=['CPUExecutionProvider']),espeak_data_dir=ESPEAK_DATA_DIR)

def generate(item):
 text,output=item
 path=Path(output)
 if path.exists() and path.stat().st_size>500:return text,str(path),None
 try:
  pcm=io.BytesIO()
  with wave.open(pcm,'wb') as wav:
   if text in overrides:
    phonemes=overrides[text]['phonemes']
    if any(p not in voice.config.phoneme_id_map for p in phonemes):raise RuntimeError('Unsupported pronunciation override')
    audio=voice.phoneme_ids_to_audio(voice.phonemes_to_ids(phonemes),SynthesisConfig(length_scale=1.05))
    peak=np.max(np.abs(audio));audio=audio/peak if peak>1e-8 else audio
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(voice.config.sample_rate);wav.writeframes((np.clip(audio,-1,1)*32767).astype(np.int16).tobytes())
   else:voice.synthesize_wav(text,wav,syn_config=SynthesisConfig(length_scale=1.05))
  result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i','pipe:0','-codec:a','libmp3lame','-b:a','56k','-ar','22050','-ac','1','-y',str(path)],input=pcm.getvalue(),capture_output=True)
  if result.returncode:raise RuntimeError(result.stderr.decode()[:200])
  if path.stat().st_size<=500:raise RuntimeError('empty audio')
  return text,str(path),None
 except Exception as exc:return text,str(path),str(exc)

def write_manifest(path,data):
 temporary=path.with_suffix('.tmp.json');temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--model',required=True);parser.add_argument('--texts',default='/tmp/romana-tts/texts.json');parser.add_argument('--workers',type=int,default=5);args=parser.parse_args()
 texts=json.loads(Path(args.texts).read_text());target=Path('public/audio');target.mkdir(parents=True,exist_ok=True)
 jobs=[(text,str(target/(hashlib.sha256(text.encode()).hexdigest()[:24]+'.mp3')))for text in texts]
 manifest_path=Path('src/data/audio-manifest.json');manifest=json.loads(manifest_path.read_text())if manifest_path.exists()else{}
 errors=[];start=time.monotonic();done=0
 with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers,initializer=init,initargs=(args.model,))as pool:
  for text,path,error in pool.map(generate,jobs,chunksize=5):
   done+=1
   if error:errors.append({'text':text,'error':error})
   else:manifest[text]='/'+str(Path(path).relative_to('public'))
   if done%100==0:
    write_manifest(manifest_path,manifest);print(f'{done}/{len(jobs)} · {time.monotonic()-start:.0f}s · errors {len(errors)}',flush=True)
 write_manifest(manifest_path,manifest)
 Path('/tmp/romana-tts/generation-report.json').write_text(json.dumps({'texts':len(texts),'files':len(manifest),'errors':errors,'seconds':round(time.monotonic()-start)},ensure_ascii=False,indent=2))
 print(f'COMPLETE: {len(manifest)} MP3 files; {len(errors)} errors; {time.monotonic()-start:.1f}s',flush=True)
 if errors:raise SystemExit(1)
if __name__=='__main__':main()
