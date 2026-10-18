import files from "../data/audio-manifest.json";
import { cachePlayedAudio } from "./audio-cache";
export type AudioStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";
export type AudioState = {
  status: AudioStatus;
  text: string;
  source: "file" | "browser" | null;
  rate: number;
  error: string;
  currentTime: number;
  duration: number;
  voices: string[];
  voiceReady: boolean;
  url: string;
};
export const audioKey = (text: string) =>
  text.normalize("NFC").replace(/\s+/g, " ").trim();
const manifest = files as Record<string, string>;
export const audioFileFor = (text: string) => manifest[audioKey(text)];
export const audioFileCount = Object.keys(manifest).length;
let state: AudioState = {
  status: "idle",
  text: "",
  source: null,
  rate: 1,
  error: "",
  currentTime: 0,
  duration: 0,
  voices: [],
  voiceReady: false,
  url: "",
};
const listeners = new Set<() => void>();
let player: HTMLAudioElement | null = null;
// Owned by the engine, outside React's root. Keep the same connected element
// through card changes and AudioBar mounts; never remove it during play().
let mediaElement: HTMLAudioElement | null = null;
function connectedPlayer() {
  if (!mediaElement || mediaElement.ownerDocument !== document) {
    mediaElement = new Audio();
    mediaElement.id = "romana-audio-player";
    mediaElement.hidden = true;
    mediaElement.setAttribute("aria-hidden", "true");
    mediaElement.preload = "auto";
  }
  if (!mediaElement.isConnected) document.body.appendChild(mediaElement);
  return mediaElement;
}
let utterance: SpeechSynthesisUtterance | null = null;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let nativeReady = false;
let pendingVoiceCleanup: (() => void) | null = null;
function emit(patch: Partial<AudioState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}
export const subscribeAudio = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getAudioState = () => state;
function synth() {
  return typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : undefined;
}
function speechVoices(): SpeechSynthesisVoice[] {
  try { return synth()?.getVoices() || []; } catch { return []; }
}
function roVoice() {
  const voices = speechVoices();
  return (
    voices.find((v) => /^ro[-_]RO$/i.test(v.lang)) ||
    voices.find((v) => /^ro$/i.test(v.lang))
  );
}
export function initializeAudio() {
  if (nativeReady || typeof window === "undefined") return;
  nativeReady = true;
  const update = () =>
    emit({
      voices:
        speechVoices()
          .filter((v) => /^ro(?:[-_]RO)?$/i.test(v.lang))
          .map((v) => `${v.name || "Румынский"} · ${v.lang}`) || [],
      voiceReady: true,
    });
  update();
  synth()?.addEventListener?.("voiceschanged", update);
  document.addEventListener("visibilitychange", () => {
    if (
      document.hidden &&
      ["loading", "playing", "paused"].includes(state.status)
    )
      stopAudio(
        "Воспроизведение остановлено при блокировке или скрытии экрана. Нажмите повтор для продолжения.",
      );
  });
  window.addEventListener("pagehide", () => stopAudio());
}
function clearPlayback() {
  clearTimeout(timer);
  pendingVoiceCleanup?.();
  pendingVoiceCleanup = null;
  if (player) {
    player.onplaying = null;
    player.onpause = null;
    player.onended = null;
    player.onerror = null;
    player.ontimeupdate = null;
    player.onloadedmetadata = null;
    player.onwaiting = null;
    player.pause();
    // pause() cancels playback without destroying the resource or detaching
    // the element. src removal + load() also abort an unsettled play promise.
    player = null;
  }
  if (utterance) {
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
    utterance.onpause = null;
    utterance.onresume = null;
    utterance = null;
  }
  // A disabled OS speech service must never prevent local MP3 playback.
  try { synth()?.cancel(); } catch { /* MP3 does not need SpeechSynthesis. */ }
}
export function stopAudio(note = "") {
  generation++;
  clearPlayback();
  emit({ status: "idle", error: note, currentTime: 0, duration: 0 });
}
function failure(
  message: string,
  id: number,
  onError: (message: string) => void,
) {
  if (id !== generation) return;
  clearPlayback();
  emit({ status: "error", error: message });
  onError(message);
}
async function filePlayback(
  text: string,
  rate: number,
  id: number,
  onError: (message: string) => void,
) {
  const url = audioFileFor(text);
  if (!url) {
    failure(
      "Нет румынского голоса ro-RO и локального аудиофайла для этой фразы. Откройте диагностику аудио.",
      id,
      onError,
    );
    return;
  }
  clearPlayback();
  emit({
    status: "loading",
    source: "file",
    error: "",
    currentTime: 0,
    duration: 0,
    url,
  });
  try {
    const media = connectedPlayer();
    player = media;
    media.preload = "auto";
    media.src = url;
    media.playbackRate = rate;
    media.onplaying = () => {
      if (id === generation) {
        clearTimeout(timer);
        emit({ status: "playing" });
        void cachePlayedAudio(url);
      }
    };
    media.onwaiting = () => {
      if (id === generation) {
        emit({ status: "loading" });
        clearTimeout(timer);
        timer = setTimeout(
          () =>
            failure(
              "Аудио прервалось при загрузке. Нажмите повтор после восстановления сети.",
              id,
              onError,
            ),
          20000,
        );
      }
    };
    media.onpause = () => {
      if (id === generation && state.status === "playing")
        emit({ status: "paused" });
    };
    media.onloadedmetadata = () => {
      if (id === generation)
        emit({
          duration: Number.isFinite(media.duration) ? media.duration : 0,
        });
    };
    media.ontimeupdate = () => {
      if (id === generation) emit({ currentTime: media.currentTime });
    };
    media.onended = () => {
      if (id === generation) {
        clearTimeout(timer);
        emit({ status: "ended", currentTime: media.duration || 0 });
      }
    };
    media.onerror = () => {
      const code = media.error?.code;
      const reasons: Record<number, string> = {
        1: "Загрузка прервана",
        2: "Сетевая ошибка",
        3: "Браузер не смог декодировать MP3",
        4: "Файл недоступен или формат не поддерживается",
      };
      failure(`${code ? reasons[code] || "Ошибка проигрывателя" : "Ошибка загрузки MP3"}${code ? ` (MediaError ${code})` : ""}. ${url}${navigator.onLine ? "" : " · Офлайн: файл мог ещё не сохраниться."}`, id, onError);
    };
    timer = setTimeout(
      () =>
        failure(
          "Загрузка аудио не завершилась. Проверьте сеть и нажмите повтор.",
          id,
          onError,
        ),
      20000,
    );
    await media.play();
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    const context = name === "AbortError"
      ? ` Плеер в документе: ${player?.isConnected ? "да" : "нет"}; readyState=${player?.readyState ?? "—"}; networkState=${player?.networkState ?? "—"}; страница=${document.visibilityState}.`
      : "";
    failure(
      name === "NotAllowedError"
        ? "Браузер заблокировал звук. Нажмите «Повтор» — запуск должен происходить вашим нажатием."
        : `MP3 не запустился${name ? ` (${name})` : ""}: ${url}. ${error instanceof Error ? error.message : "Проверьте сеть и формат в диагностике."}${context}`,
      id,
      onError,
    );
  }
}
function nativePlayback(
  text: string,
  rate: number,
  id: number,
  onError: (message: string) => void,
) {
  const voice = roVoice();
  const engine = synth();
  if (!voice || !engine) {
    void filePlayback(text, rate, id, onError);
    return;
  }
  emit({ source: "browser", status: "loading" });
  const u = new SpeechSynthesisUtterance(text);
  utterance = u;
  u.voice = voice;
  u.lang = "ro-RO";
  u.rate = rate;
  const fallback = () => {
    if (id !== generation) return;
    void filePlayback(text, rate, id, onError);
  };
  u.onstart = () => {
    if (id === generation) {
      clearTimeout(timer);
      emit({ status: "playing" });
      timer = setTimeout(fallback, Math.max(8000, (text.length * 120) / rate));
    }
  };
  u.onpause = () => {
    if (id === generation) {clearTimeout(timer);emit({ status: "paused" });}
  };
  u.onresume = () => {
    if (id === generation) {clearTimeout(timer);emit({ status: "playing" });timer=setTimeout(fallback,Math.max(8000,(text.length*120)/rate));}
  };
  u.onend = () => {
    if (id === generation) {
      clearTimeout(timer);
      emit({ status: "ended" });
    }
  };
  u.onerror = fallback;
  timer = setTimeout(fallback, 3500);
  try {
    engine.speak(u);
  } catch {
    fallback();
  }
}
/** Called by a user gesture only. No hidden language substitution or autoplay. */
export function speak(
  text: string,
  rate: number,
  onError: (message: string) => void = () => {},
  strategy: "auto" | "file" | "browser" = "auto",
) {
  initializeAudio();
  generation++;
  const id = generation;
  clearPlayback();
  emit({
    status: "loading",
    text: audioKey(text),
    rate,
    source: null,
    error: "",
    currentTime: 0,
    duration: 0,
    url: "",
  });
  if (strategy === "file") {
    void filePlayback(text, rate, id, onError);
    return;
  }
  if (audioFileFor(text) && (strategy !== "browser" || text.length > 160)) {
    void filePlayback(text, rate, id, onError);
    return;
  }
  if (roVoice()) {
    nativePlayback(text, rate, id, onError);
    return;
  }
  // Known local files start synchronously within the mobile user gesture.
  if (audioFileFor(text)) {
    void filePlayback(text, rate, id, onError);
    return;
  }
  const engine = synth();
  if (!engine) {
    failure(
      "Этот браузер не поддерживает синтез речи, и локальный файл для фразы отсутствует.",
      id,
      onError,
    );
    return;
  }
  // Some browsers expose an empty list until voiceschanged fires.
  const check = () => {
    if (id === generation && roVoice()) {
      clearTimeout(timer);
      engine.removeEventListener?.("voiceschanged", check);
      nativePlayback(text, rate, id, onError);
    }
  };
  engine.addEventListener?.("voiceschanged", check);
  pendingVoiceCleanup = () =>
    engine.removeEventListener?.("voiceschanged", check);
  timer = setTimeout(() => {
    engine.removeEventListener?.("voiceschanged", check);
    if (id === generation) void filePlayback(text, rate, id, onError);
  }, 1500);
}
export function pauseAudio() {
  if (state.status !== "playing") return;
  if (state.source === "file") player?.pause();
  else {
    try {
      synth()?.pause();
    } catch {
      stopAudio(
        "Браузер не смог поставить системный голос на паузу. Нажмите повтор.",
      );
    }
  }
}
export function resumeAudio(onError: (message: string) => void = () => {}) {
  if (state.status !== "paused") return;
  if (state.source === "file" && player) {
    const id = generation;
    player
      .play()
      .catch(() =>
        failure(
          "Нажмите повтор: браузер не разрешил продолжить аудио.",
          id,
          onError,
        ),
      );
  } else {
    const id = generation;
    timer = setTimeout(() => {
      if (id === generation && state.status === "paused")
        speak(state.text, state.rate, onError);
    }, 1500);
    try{synth()?.resume()}catch{failure('Системный голос не возобновился. Запустите локальный MP3 повторно.',id,onError)}
  }
}
export function repeatAudio(onError: (message: string) => void = () => {}) {
  if (state.text) speak(state.text, state.rate, onError);
}
export function setAudioRate(rate: number) {
  if (![0.75, 1, 1.25].includes(rate)) return;
  if (player) player.playbackRate = rate;
  emit({ rate });
  if (
    state.source === "browser" &&
    ["playing", "paused"].includes(state.status)
  )
    stopAudio(
      "Скорость изменена. Нажмите повтор, чтобы применить её к системному голосу.",
    );
}
