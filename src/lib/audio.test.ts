// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("../data/audio-manifest.json", () => ({
  default: {
    "Bună!": "/audio/buna.mp3",
    "Bună ziua! Învăț limba română.": "/audio/test.mp3",
  },
}));
let api: typeof import("./audio");
let instances: MediaMock[] = [];
let blocked = false;
class MediaMock {
  src = "";
  preload = "";
  playbackRate = 1;
  currentTime = 0;
  duration = 2;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  constructor() {
    const element = document.createElement("audio");
    Object.defineProperties(element, Object.getOwnPropertyDescriptors(this));
    instances.push(element as unknown as MediaMock);
    return element as unknown as MediaMock;
  }
  play = vi.fn(async function(this: MediaMock) {
    if (!(this as unknown as HTMLAudioElement).isConnected)
      throw new DOMException("The play() request was interrupted because the media was removed from the document.", "AbortError");
    if (blocked) throw new DOMException("blocked", "NotAllowedError");
    this.onloadedmetadata?.();
    this.onplaying?.();
  });
  pause = vi.fn(function(this: MediaMock) { this.onpause?.(); });
  load = vi.fn();
  removeAttribute = vi.fn();
}
let voices: { lang: string; name?: string }[] = [];
let engine: EventTarget & {
  getVoices: () => typeof voices;
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
};
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  instances = [];
  voices = [];
  blocked = false;
  engine = Object.assign(new EventTarget(), {
    getVoices: () => voices,
    cancel: vi.fn(),
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  });
  vi.stubGlobal("speechSynthesis", engine);
  vi.stubGlobal("Audio", MediaMock);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  api = await import("./audio");
});
afterEach(() => {
  api.stopAudio();
  document.getElementById("romana-audio-player")?.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Надёжный румынский аудиодвижок", () => {
  it("ждёт voiceschanged вместо ложного немедленного отказа", () => {
    const error = vi.fn();
    api.speak("Mulțumesc!", 0.75, error);
    expect(api.getAudioState().status).toBe("loading");
    expect(error).not.toHaveBeenCalled();
    voices = [{ lang: "ru-RU" }, { lang: "ro-RO", name: "Mihai" }];
    engine.dispatchEvent(new Event("voiceschanged"));
    expect(engine.speak).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "ro-RO", rate: 0.75, voice: voices[1] }),
    );
    const u = engine.speak.mock.calls[0][0];
    u.onstart();
    expect(api.getAudioState().status).toBe("playing");
  });
  it("предпочитает голос Румынии ro-RO перед другими локалями", () => {
    voices = [{ lang: "ro-MD" }, { lang: "ro-RO", name: "Romania" }];
    api.speak("Bună!", 1,()=>{},"browser");
    expect(engine.speak).toHaveBeenCalledWith(
      expect.objectContaining({ voice: voices[1], lang: "ro-RO" }),
    );
  });
  it("для опубликованного материала предпочитает локальный Piper даже при доступном системном голосе",async()=>{voices=[{lang:'ro-RO'}];api.speak('Bună!',1);await Promise.resolve();expect(engine.speak).not.toHaveBeenCalled();expect(api.getAudioState()).toMatchObject({source:'file',status:'playing'})});
  it("таймер системного голоса не запускает резервный звук во время паузы",async()=>{voices=[{lang:'ro-RO'}];api.speak('Bună!',1,()=>{},'browser');const utterance=engine.speak.mock.calls[0][0];utterance.onstart();utterance.onpause();await vi.advanceTimersByTimeAsync(20000);expect(api.getAudioState().status).toBe('paused');expect(instances).toHaveLength(0);utterance.onresume();expect(api.getAudioState().status).toBe('playing');utterance.onend();expect(api.getAudioState().status).toBe('ended')});
  it("при отсутствии ro-голоса воспроизводит настоящий локальный MP3", async () => {
    voices = [{ lang: "ru-RU" }, { lang: "en-US" }];
    api.speak("Bună!", 1);
    await Promise.resolve();
    expect(engine.speak).not.toHaveBeenCalled();
    expect(instances[0].src).toBe("/audio/buna.mp3");
    expect(api.getAudioState()).toMatchObject({
      status: "playing",
      source: "file",
      duration: 2,
    });
  });
  it("резерв работает без поддержки SpeechSynthesis", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    api.speak("Bună!", 1);
    await Promise.resolve();
    expect(api.getAudioState()).toMatchObject({
      status: "playing",
      source: "file",
    });
  });
  it("локальный MP3 не зависит от исправности системного синтезатора", async () => {
    engine.cancel.mockImplementation(() => { throw new Error("OS speech unavailable"); });
    api.speak("Bună!", 1);
    await Promise.resolve();
    expect(api.getAudioState()).toMatchObject({ status: "playing", source: "file", url: "/audio/buna.mp3" });
  });
  it("ошибка декодера содержит код и конкретный URL", async () => {
    api.speak("Bună!", 1);
    await Promise.resolve();
    Object.assign(instances[0], { error: { code: 3 } });
    instances[0].onerror?.();
    expect(api.getAudioState().error).toContain("MediaError 3");
    expect(api.getAudioState().error).toContain("/audio/buna.mp3");
  });
  it("не сообщает о воспроизведении при отказе мобильного autoplay", async () => {
    blocked = true;
    const error = vi.fn();
    api.speak("Bună!", 1, error);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.getAudioState().status).toBe("error");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("Нажмите"));
    blocked = false;
    api.repeatAudio(error);
    await Promise.resolve();
    expect(api.getAudioState().status).toBe("playing");
  });
  it("ошибка системного голоса переключает только на румынский файл", async () => {
    voices = [{ lang: "ro-RO" }];
    api.speak("Bună!", 1,()=>{},"browser");
    engine.speak.mock.calls[0][0].onerror();
    await Promise.resolve();
    expect(api.getAudioState()).toMatchObject({
      status: "playing",
      source: "file",
    });
  });
  it("не зависает, если системный голос не начал звучать", async () => {
    voices = [{ lang: "ro-RO" }];
    api.speak("Bună!", 1,()=>{},"browser");
    await vi.advanceTimersByTimeAsync(3501);
    expect(api.getAudioState()).toMatchObject({
      status: "playing",
      source: "file",
    });
  });
  it("быстрое переключение отменяет старый файл и игнорирует его события", async () => {
    api.speak("Bună!", 1);
    const old = instances[0];
    const ended = old.onended;
    api.speak("Bună ziua! Învăț limba română.", 1.25);
    await Promise.resolve();
    ended?.();
    expect(old.pause).toHaveBeenCalled();
    expect(api.getAudioState()).toMatchObject({
      text: "Bună ziua! Învăț limba română.",
      rate: 1.25,
      status: "playing",
    });
    expect(instances).toHaveLength(1);
    expect(instances[0].playbackRate).toBe(1.25);
  });
  it("закрепляет проигрыватель вне React root до вызова play и сохраняет его при смене карточки", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    api.speak("Bună!", 1);
    const media = document.getElementById("romana-audio-player") as HTMLAudioElement;
    expect(media.parentElement).toBe(document.body);
    expect(media.isConnected).toBe(true);
    root.replaceChildren(document.createElement("section"));
    api.speak("Bună ziua! Învăț limba română.", 1);
    await Promise.resolve();
    expect(document.getElementById("romana-audio-player")).toBe(media);
    expect(instances).toHaveLength(1);
    expect(instances[0].load).not.toHaveBeenCalled();
    expect(instances[0].removeAttribute).not.toHaveBeenCalled();
    api.stopAudio();
    expect(media.isConnected).toBe(true);
    root.remove();
  });
  it("прерванный старый play не переводит новый MP3 в ошибку", async () => {
    let abortOld!: (error: DOMException) => void;
    api.speak("Bună!", 1);
    await Promise.resolve();
    instances[0].play.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { abortOld = reject; }));
    api.speak("Bună!", 1);
    api.speak("Bună ziua! Învăț limba română.", 1);
    abortOld(new DOMException("The media was removed from the document", "AbortError"));
    await Promise.resolve();
    await Promise.resolve();
    expect(api.getAudioState()).toMatchObject({ status: "playing", text: "Bună ziua! Învăț limba română.", error: "" });
  });
  it("актуальный AbortError остаётся ошибкой и сообщает состояние DOM-плеера", async () => {
    api.speak("Bună!", 1);
    await Promise.resolve();
    instances[0].play.mockRejectedValueOnce(new DOMException("media removed", "AbortError"));
    api.repeatAudio();
    await Promise.resolve();
    await Promise.resolve();
    expect(api.getAudioState().status).toBe("error");
    expect(api.getAudioState().error).toContain("Плеер в документе: да");
    expect(api.getAudioState().error).toContain("AbortError");
  });
  it("пауза, продолжение и смена скорости управляют реальным media-объектом", async () => {
    api.speak("Bună!", 1);
    await Promise.resolve();
    api.pauseAudio();
    expect(api.getAudioState().status).toBe("paused");
    api.setAudioRate(0.75);
    expect(instances[0].playbackRate).toBe(0.75);
    api.resumeAudio();
    await Promise.resolve();
    expect(api.getAudioState().status).toBe("playing");
    instances[0].onended?.();
    expect(api.getAudioState().status).toBe("ended");
  });
  it("stop отменяет ожидание и не начинает звук после смены страницы", async () => {
    api.speak("Fără fișier", 1);
    api.stopAudio();
    voices = [{ lang: "ro-RO" }];
    engine.dispatchEvent(new Event("voiceschanged"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(engine.speak).not.toHaveBeenCalled();
    expect(instances).toHaveLength(0);
    expect(api.getAudioState().status).toBe("idle");
  });
  it("блокировка экрана останавливает файл без скрытого автозапуска", async () => {
    api.speak("Bună!", 1);
    await Promise.resolve();
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(api.getAudioState().status).toBe("idle");
    expect(instances[0].pause).toHaveBeenCalled();
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(instances).toHaveLength(1);
  });
  it("при отсутствии обоих источников сообщает ошибку после ожидания голосов", async () => {
    const error = vi.fn();
    api.speak("Нет файла", 1, error);
    await vi.advanceTimersByTimeAsync(1501);
    expect(api.getAudioState().status).toBe("error");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("ro-RO"));
  });
  it("обрабатывает сетевую ошибку и никогда не оставляет статус playing", async () => {
    const error = vi.fn();
    api.speak("Bună!", 1, error);
    await Promise.resolve();
    instances[0].onerror?.();
    expect(api.getAudioState().status).toBe("error");
    expect(error).toHaveBeenCalledOnce();
  });
});
