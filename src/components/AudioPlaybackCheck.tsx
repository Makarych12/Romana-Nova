import { useEffect, useRef, useState } from "react";
import cases from "../data/audio-playback-check.json";
import { audioSessionId, getAudioState, speak, stopAudioIfSession, subscribeAudio } from "../lib/audio";
import { checkAudioDelivery, type MediaCheck } from "../lib/media-check";
type Result = { id: string; kind: string; text: string; url: string; played: boolean; timeUpdates: number; currentTime: number; duration: number; playingObserved: boolean; error: string; http?: MediaCheck };
export default function AudioPlaybackCheck({ speed, notify }: { speed: number; notify: (s: string) => void }) {
  const [running, setRunning] = useState(false), [results, setResults] = useState<Result[]>([]);
  const run = useRef(0), ownedSession = useRef(-1), controller = useRef<AbortController | null>(null);
  useEffect(() => () => { run.current++; controller.current?.abort(); stopAudioIfSession(ownedSession.current); }, []);
  async function check() {
    const id = ++run.current, rows: Result[] = []; controller.current?.abort(); controller.current = new AbortController();
    setResults([]); setRunning(true);
    for (const sample of cases) {
      if (id !== run.current) break;
      let playingObserved = false;
      const unsubscribe = subscribeAudio(() => { const s = getAudioState(); if (s.text === sample.text && s.status === "playing") playingObserved = true; });
      // Start with the click, before HTTP awaits. Every line uses AudioService.
      const pending = speak(sample.text, speed, () => {}, "file"); ownedSession.current = audioSessionId();
      const session = ownedSession.current;
      const http = checkAudioDelivery(sample.kind, sample.text, controller.current.signal);
      const played = await pending; const state = getAudioState(); unsubscribe();
      if (id !== run.current || session !== audioSessionId()) break; // Another user action owns the engine now.
      const row = { ...sample, played, timeUpdates: state.timeUpdates, currentTime: state.currentTime, duration: state.duration, playingObserved, error: state.error, http: await http };
      if (id !== run.current || session !== audioSessionId()) break;
      rows.push(row); setResults([...rows]);
      if (!played) { notify(state.error || "Проверка остановлена: MP3 не завершился."); break; }
    }
    if (id === run.current) setRunning(false);
  }
  function stop() { run.current++; controller.current?.abort(); stopAudioIfSession(ownedSession.current); setRunning(false); }
  function download() {
    const data = { checkedAt: new Date().toISOString(), userAgent: navigator.userAgent, scope: "Browser HTTP/media events; physical audibility is not verified by this report.", requested: cases.length, completed: results.length, results };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "romana-browser-audio-check.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="audio-playback-check">
    <summary>Проверка воспроизведения: cafea, 20 карточек, 10 предложений, 3 диалога</summary>
    <p>Проверка последовательно запускает настоящие MP3. Отчёт фиксирует HTTP, playing/ended, currentTime и число событий timeupdate. Слышимость подтвердите самостоятельно. Для проверки поставьте звук на паузу, измените скорость и продолжите через общий плеер.</p>
    <div className="button-row"><button className="secondary" disabled={running} onClick={check}>{running ? `Проверяем ${results.length + 1}/${cases.length}…` : "Запустить проверку 33 MP3"}</button><button className="secondary" disabled={!running} onClick={stop}>Остановить проверку</button><button className="secondary" disabled={!results.length} onClick={download}>Скачать отчёт браузера</button></div>
    <ol aria-live="polite">{results.map((row, i) => <li key={row.id + row.kind + i} lang="ro"><strong>{row.text.length > 70 ? row.text.slice(0, 70) + "…" : row.text}</strong><span lang="ru"> — {row.played ? "ended" : row.error || "прервано"} · playing: {row.playingObserved ? "да" : "нет"} · timeupdate: {row.timeUpdates} · {row.currentTime.toFixed(2)}/{row.duration.toFixed(2)} с · HTTP {row.http?.status ?? "ошибка"}</span></li>)}</ol>
  </details>;
}
