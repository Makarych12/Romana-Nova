/** Adapted from CHAMELEON BG src/speech.ts: one player, cancellable sessions,
 * bounded lookup, completed-line queues, Piper then the real Romanian voice.
 * Retains ROMÂNA NOVA's public API and existing content-addressed MP3 paths. */
import { audioFileFor, resolveAudioFile, audioFileCount, audioKey, prepareAudio } from "./audio-index";
import { cachePlayedAudio } from "./audio-cache";
import { requestPiper, rememberPiper } from "./audio-tts";
export { audioFileFor, resolveAudioFile, audioFileCount, audioKey, prepareAudio };
export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";
export type AudioState = {
  status: AudioStatus; text: string; source: "file" | "server" | "browser" | null;
  rate: number; volume: number; error: string; currentTime: number; duration: number;
  voices: string[]; voiceReady: boolean; url: string; sequenceIndex: number; sequenceLength: number;
  timeUpdates: number;
};
type Strategy = "auto" | "file" | "browser";
type Notify = (message: string) => void;
function preferences() { try { return JSON.parse(localStorage.getItem("romana-audio-preferences") || "{}") || {}; } catch { return {}; } }
const saved = preferences();
let state: AudioState = { status: "idle", text: "", source: null, rate: 1,
  volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 1,
  error: "", currentTime: 0, duration: 0, voices: [], voiceReady: false, url: "", sequenceIndex: -1, sequenceLength: 0, timeUpdates: 0 };
const listeners = new Set<() => void>();
export const subscribeAudio = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getAudioState = () => state;
function emit(patch: Partial<AudioState>) {
  if (Object.entries(patch).every(([k, v]) => state[k as keyof AudioState] === v)) return;
  state = { ...state, ...patch }; listeners.forEach(fn => fn());
}
let element: HTMLAudioElement | null = null;
let context: AudioContext | null = null, analyser: AnalyserNode | null = null, input: MediaElementAudioSourceNode | null = null;
let outputReady: Promise<void> = Promise.resolve();
let generation = 0, attemptId = 0, initialized = false;
let request: AbortController | null = null;
let cancelPending: (() => void) | null = null;
let pauseWatchdog: (() => void) | null = null, resumeWatchdog: (() => void) | null = null;
let queueCleanup: (() => void) | null = null;
let lastRequest: { texts: string[]; strategy: Strategy } | null = null;
const synth = () => typeof window !== "undefined" ? window.speechSynthesis : undefined;
function voices(): SpeechSynthesisVoice[] { try { return synth()?.getVoices() || []; } catch { return []; } }
const isRomanian = (v: SpeechSynthesisVoice) => /^ro(?:[-_]RO)?$/i.test(v.lang) && (v.localService || navigator.onLine);
export const audioAnalyser = () => context?.state === "running" ? analyser : null;
export function initializeAudio() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const update = () => emit({ voices: voices().filter(isRomanian).map(v => `${v.name || "Румынский"} · ${v.lang}`), voiceReady: true });
  update();
  try { synth()?.addEventListener("voiceschanged", update); } catch { /* Local MP3 stays usable. */ }
  window.addEventListener("pagehide", () => stopAudio());
}
// BG's abortable(): cancellation must settle even an unresponsive play/fetch.
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(new DOMException("Cancelled", "AbortError")); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}
function player() {
  if (!element) {
    element = new Audio(); element.id = "romana-audio-player";
    element.hidden = true; element.setAttribute("aria-hidden", "true");
    element.preload = "metadata"; element.preservesPitch = true;
  }
  if (!element.isConnected) document.body.appendChild(element);
  element.volume = state.volume;
  // Exactly the reference's mobile bypass: never route touch/mobile speech
  // through a suspended WebAudio graph and mistake a moving clock for sound.
  const nativeOnly = /Android|iPhone|iPad/i.test(navigator.userAgent) || window.matchMedia?.("(pointer: coarse)").matches;
  if (!nativeOnly && typeof AudioContext !== "undefined") {
    try {
      context ??= new AudioContext();
      const activeContext = context, media = element;
      outputReady = (context.state === "running" ? Promise.resolve() : context.resume()).then(() => {
        if (activeContext.state !== "running") throw Error("AudioContext не возобновился");
        if (!input) {
          // createMediaElementSource is called once for this lifetime element.
          const source = activeContext.createMediaElementSource(media);
          const meter = activeContext.createAnalyser(); meter.fftSize = 256; meter.smoothingTimeConstant = .75;
          source.connect(meter).connect(activeContext.destination); input = source; analyser = meter;
        }
      }).catch(error => { if (input) throw error; /* No graph attached: keep native playback. */ });
      void outputReady.catch(() => {});
    } catch { /* Browser without WebAudio retains the native MP3 path. */ }
  }
  return element;
}
function detachHandlers(audio: HTMLAudioElement) {
  audio.onplaying = audio.onpause = audio.onended = audio.onerror = audio.ontimeupdate = audio.onloadedmetadata = audio.onwaiting = audio.onstalled = null;
}
export function stopAudio(note = "") {
  generation++; request?.abort(); request = null;
  cancelPending?.(); cancelPending = null;
  pauseWatchdog = resumeWatchdog = null;
  const clearQueue = queueCleanup; queueCleanup = null; clearQueue?.();
  if (element) { detachHandlers(element); element.pause(); }
  // Keep the element and src in the document. No removeAttribute/load/React
  // cleanup can tear down a new play request while an old promise settles.
  try { synth()?.cancel(); } catch { /* OS speech is optional. */ }
  emit({ status: "idle", error: note, currentTime: 0, duration: 0, sequenceIndex: -1, sequenceLength: 0 });
}
type Outcome = { ok: boolean; error?: string; blocked?: boolean; fatal?: boolean };
function playFile(url: string, token: number, source: "file" | "server", signal: AbortSignal): Promise<Outcome> {
  if (token !== generation || signal.aborted) return Promise.resolve({ ok: false });
  const audio = player();
  attemptId++;
  emit({ source, url, status: "loading", currentTime: 0, duration: 0, timeUpdates: 0 });
  return new Promise(resolve => {
    let done = false, lastTime = -1;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: Outcome) => {
      if (done) return; done = true; clearTimeout(timer); signal.removeEventListener("abort", cancel);
      // An old attempt may settle after a new one owns the same element.
      if (cancelPending === cancel) {
        attemptId++;
        detachHandlers(audio); cancelPending = null; pauseWatchdog = resumeWatchdog = null;
        if (!result.ok) audio.pause();
      }
      resolve(result);
    };
    const cancel = () => finish({ ok: false });
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => finish({ ok: false, error: `MP3 перестал загружаться или продвигаться: ${url}` }), 12000); };
    cancelPending = cancel; pauseWatchdog = () => clearTimeout(timer); resumeWatchdog = arm;
    signal.addEventListener("abort", cancel, { once: true });
    audio.onplaying = () => { if (token === generation && !done) { arm(); emit({ status: "playing" }); if (source === "file") void cachePlayedAudio(url); } };
    audio.onloadedmetadata = () => { if (token === generation && !done) emit({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }); };
    audio.onpause = () => { if (token === generation && !done && state.status === "playing") { pauseWatchdog?.(); emit({ status: "paused" }); } };
    audio.ontimeupdate = () => {
      if (token !== generation || done) return;
      emit({ currentTime: audio.currentTime, timeUpdates: state.timeUpdates + 1 });
      if (audio.currentTime !== lastTime && state.status !== "paused") { lastTime = audio.currentTime; arm(); }
    };
    audio.onwaiting = audio.onstalled = () => { if (token === generation && !done && state.status !== "paused") { emit({ status: "loading" }); arm(); } };
    audio.onended = () => { if (token === generation && !done) { emit({ currentTime: Number.isFinite(audio.duration) ? audio.duration : audio.currentTime }); finish({ ok: true }); } };
    audio.onerror = () => finish({ ok: false, error: `MediaError ${audio.error?.code ?? "?"}: ${audio.error?.message || "не удалось загрузить или декодировать MP3"} · ${url}` });
    audio.src = url; audio.playbackRate = state.rate; audio.volume = state.volume;
    arm();
    const start = () => {
      if (token !== generation || done || signal.aborted) return;
      try { void audio.play().catch(error => {
        if (done) return;
        const name = error?.name || "Error";
        finish({ ok: false, blocked: name === "NotAllowedError", fatal: name === "AbortError", error: name === "NotAllowedError"
          ? `Браузер заблокировал звук. Нажмите «Повтор» для запуска вашим нажатием. · ${url}`
          : `${name}: ${error?.message || "MP3 не запустился"} · ${url} · плеер в документе: ${audio.isConnected ? "да" : "нет"}; readyState=${audio.readyState}; networkState=${audio.networkState}; страница=${document.visibilityState}` });
      }); } catch (error) { finish({ ok: false, error: String(error) }); }
    };
    // With native output, cached/bootstrap files still start inside the click.
    if (!context) start();
    else void abortable(outputReady, signal).then(start, error => finish({ ok: false, error: `AudioContext: ${String(error)}` }));
  });
}
async function systemVoice(text: string, token: number, signal: AbortSignal): Promise<Outcome> {
  const engine = synth(); if (!engine) return { ok: false };
  if (!voices().some(isRomanian)) {
    await new Promise<void>(resolve => {
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => { clearTimeout(timer); engine.removeEventListener?.("voiceschanged", finish); signal.removeEventListener("abort", finish); resolve(); };
      engine.addEventListener?.("voiceschanged", finish); signal.addEventListener("abort", finish, { once: true }); timer = setTimeout(finish, 600);
    });
  }
  if (token !== generation || signal.aborted) return { ok: false };
  const voice = voices().find(isRomanian); if (!voice) return { ok: false };
  attemptId++;
  return new Promise(resolve => {
    let done = false, timer: ReturnType<typeof setTimeout>;
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = "ro-RO"; utterance.rate = state.rate; utterance.volume = state.volume;
    const finish = (ok: boolean) => {
      if (done) return; done = true; clearTimeout(timer); signal.removeEventListener("abort", cancel);
      utterance.onstart = utterance.onend = utterance.onerror = utterance.onpause = utterance.onresume = null;
      if (cancelPending === cancel) { attemptId++; cancelPending = null; pauseWatchdog = resumeWatchdog = null; }
      resolve({ ok });
    };
    const cancel = () => finish(false);
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { finish(false); if (token === generation) engine.cancel(); }, Math.max(15000, text.length * 200 / state.rate)); };
    cancelPending = cancel; pauseWatchdog = () => clearTimeout(timer); resumeWatchdog = arm;
    signal.addEventListener("abort", cancel, { once: true });
    utterance.onstart = () => { if (token === generation && !done) { emit({ status: "playing", source: "browser" }); arm(); } };
    utterance.onend = () => finish(true); utterance.onerror = () => finish(false);
    utterance.onpause = () => { if (token === generation && !done) { pauseWatchdog?.(); emit({ status: "paused" }); } };
    utterance.onresume = () => { if (token === generation && !done) { arm(); emit({ status: "playing" }); } };
    timer = setTimeout(() => finish(false), 3500);
    emit({ source: "browser", url: "", status: "loading" });
    try { engine.speak(utterance); } catch { finish(false); }
  });
}
async function cachedUrl(url: string, signal: AbortSignal) {
  if (!("caches" in globalThis)) return;
  for (const name of ["romana-audio-v2", "romana-audio-v1", "romana-audio-generated-v1"]) {
    const response = await abortable((await caches.open(name)).match(url), signal);
    if (response?.headers.get("content-type")?.startsWith("audio/")) return URL.createObjectURL(await abortable(response.blob(), signal));
  }
}
async function playText(text: string, token: number, signal: AbortSignal, notify: Notify, strategy: Strategy): Promise<boolean> {
  if (token !== generation || signal.aborted) return false;
  emit({ status: "loading", text: audioKey(text), source: null, error: "", currentTime: 0, duration: 0, url: "", timeUpdates: 0 });
  let lastError = "Нет готового MP3 для этой фразы.";
  try {
    if (strategy !== "browser") {
      const url = audioFileFor(text) ?? await abortable(resolveAudioFile(text), signal);
      if (token !== generation || signal.aborted) return false;
      if (url) {
        let savedUrl: string | undefined;
        // Like BG: selected/cached audio can play without a working index/network.
        if (!navigator.onLine) try { savedUrl = await abortable(cachedUrl(url, signal), signal); } catch { /* Native URL/SW may still work. */ }
        let result: Outcome;
        try { result = await playFile(savedUrl ?? url, token, "file", signal); }
        finally { if (savedUrl) URL.revokeObjectURL(savedUrl); }
        if (result.ok) return true;
        lastError = result.error || lastError;
        if (result.blocked || result.fatal) throw Error(lastError);
      }
      if (strategy === "file") throw Error(lastError);
      if (token !== generation || signal.aborted) return false;
      {
        emit({ status: "loading", source: "server", url: "" });
        const blob = await abortable(requestPiper(text, signal), signal);
        if (token !== generation || signal.aborted) return false;
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          try {
            const result = await playFile(objectUrl, token, "server", signal);
            if (result.ok) { void rememberPiper(text, blob); return true; }
            lastError = result.error || lastError;
            if (result.blocked || result.fatal) throw Error(lastError);
          } finally { URL.revokeObjectURL(objectUrl); }
        }
      }
    }
    if (token !== generation || signal.aborted) return false;
    if ((await systemVoice(text, token, signal)).ok) return true;
    if (token === generation && !signal.aborted) throw Error(`${lastError} Румынский Piper endpoint и настоящий голос ro-RO сейчас недоступны.`);
  } catch (error) {
    if (token === generation && !signal.aborted) {
      const message = error instanceof Error ? error.message : String(error);
      emit({ status: "error", error: message }); notify(message);
    }
  }
  return false;
}
function begin(rate: number) {
  initializeAudio(); stopAudio(); setAudioRate(rate); player();
  request = new AbortController(); return { token: generation, signal: request.signal };
}
export function speak(text: string, rate: number, notify: Notify = () => {}, strategy: Strategy = "auto"): Promise<boolean> {
  const { token, signal } = begin(rate); lastRequest = { texts: [text], strategy };
  return playText(text, token, signal, notify, strategy).then(ok => { if (ok && token === generation) emit({ status: "ended" }); return ok; });
}
export async function speakSequence(texts: string[], rate: number, notify: Notify = () => {}, onLine?: (index: number) => void) {
  const { token, signal } = begin(rate); lastRequest = { texts: [...texts], strategy: "auto" };
  queueCleanup = () => onLine?.(-1);
  for (let i = 0; i < texts.length && token === generation; i++) {
    emit({ sequenceIndex: i, sequenceLength: texts.length }); onLine?.(i);
    if (!await playText(texts[i], token, signal, notify, "auto")) break;
    if (i === texts.length - 1 && token === generation) emit({ status: "ended" });
  }
  if (token === generation) { queueCleanup?.(); queueCleanup = null; emit({ sequenceIndex: -1, sequenceLength: 0 }); }
}
export function pauseAudio() {
  if (state.status !== "playing") return;
  pauseWatchdog?.();
  if (state.source === "browser") synth()?.pause(); else element?.pause();
  emit({ status: "paused" });
}
export async function resumeAudio(notify: Notify = () => {}) {
  if (state.status !== "paused" || !request) return;
  const token = generation, attempt = attemptId, signal = request.signal;
  try {
    if (state.source === "browser") synth()?.resume();
    else {
      player();
      if (context) await abortable(outputReady, signal);
      if (token !== generation) return;
      resumeWatchdog?.(); await abortable(element!.play(), signal);
    }
    if (token === generation && attempt === attemptId) { resumeWatchdog?.(); emit({ status: "playing" }); }
  } catch { if (token === generation && attempt === attemptId) { stopAudio(); const error = "Не удалось продолжить звук. Нажмите «Повтор»."; emit({ status: "error", error }); notify(error); } }
}
export function repeatAudio(notify: Notify = () => {}) {
  if (lastRequest?.texts.length && lastRequest.texts.length > 1) return speakSequence(lastRequest.texts, state.rate, notify);
  if (state.text) return speak(state.text, state.rate, notify, lastRequest?.strategy || "auto");
}
export function setAudioRate(rate: number) {
  if (!Number.isFinite(rate) || rate < .5 || rate > 1.5) return;
  if (element) element.playbackRate = rate;
  emit({ rate });
  if (state.source === "browser" && ["playing", "paused"].includes(state.status)) stopAudio("Скорость изменена. Нажмите повтор для системного голоса.");
}
export function setAudioVolume(volume: number) {
  if (!Number.isFinite(volume)) return;
  volume = Math.max(0, Math.min(1, volume)); if (element) element.volume = volume; emit({ volume });
  try { localStorage.setItem("romana-audio-preferences", JSON.stringify({ volume })); } catch { /* Playback needs no storage. */ }
}
export const AudioService = { speak, speakSequence, stop: stopAudio, pause: pauseAudio, resume: resumeAudio, repeat: repeatAudio, setRate: setAudioRate, setVolume: setAudioVolume, prepare: prepareAudio };
export const audioSessionId = () => generation;
export function stopAudioIfSession(token: number) { if (token === generation) stopAudio(); }
