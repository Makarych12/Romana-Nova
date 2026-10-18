// @vitest-environment jsdom
// Regression cases adapted from CHAMELEON BG src/speech.test.ts.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const dependencies = vi.hoisted(() => ({ resolve: vi.fn(), piper: vi.fn() }));
vi.mock("./audio-index", () => {
  const key = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();
  const files: Record<string, string> = { "Bună!": "/audio/buna.mp3", "Bună ziua! Învăț limba română.": "/audio/test.mp3", cafea: "/audio/2b74797589c1dd08c06b07cb.mp3" };
  return { audioKey: key, audioFileFor: (text: string) => files[key(text)], resolveAudioFile: dependencies.resolve, audioFileCount: 3, prepareAudio: vi.fn() };
});
vi.mock("./audio-tts", () => ({ requestPiper: dependencies.piper, rememberPiper: vi.fn() }));
let api: typeof import("./audio");
let instances: MediaMock[] = [], blocked = false;
class MediaMock {
  src = ""; preload = ""; playbackRate = 1; volume = 1; currentTime = 0; duration = 2;
  onplaying: (() => void) | null = null; onpause: (() => void) | null = null;
  onended: (() => void) | null = null; onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null; onloadedmetadata: (() => void) | null = null;
  onwaiting: (() => void) | null = null; onstalled: (() => void) | null = null;
  constructor() {
    const element = document.createElement("audio");
    Object.defineProperties(element, Object.getOwnPropertyDescriptors(this));
    instances.push(element as unknown as MediaMock); return element as unknown as MediaMock;
  }
  play = vi.fn(async function(this: MediaMock) {
    if (!(this as unknown as HTMLAudioElement).isConnected) throw new DOMException("The media was removed from the document", "AbortError");
    if (blocked) throw new DOMException("blocked", "NotAllowedError");
    this.onloadedmetadata?.(); this.onplaying?.();
  });
  pause = vi.fn(function(this: MediaMock) { this.onpause?.(); });
  load = vi.fn(); removeAttribute = vi.fn();
}
let available: { lang: string; name?: string; localService?: boolean }[] = [];
let engine: EventTarget & { getVoices: () => typeof available; cancel: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
beforeEach(async () => {
  vi.useFakeTimers(); vi.resetModules(); instances = []; available = []; blocked = false;
  dependencies.resolve.mockReset().mockResolvedValue(undefined); dependencies.piper.mockReset().mockResolvedValue(undefined);
  localStorage.removeItem("romana-audio-preferences");
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  engine = Object.assign(new EventTarget(), { getVoices: () => available, cancel: vi.fn(), speak: vi.fn(), pause: vi.fn(), resume: vi.fn() });
  vi.stubGlobal("speechSynthesis", engine); vi.stubGlobal("Audio", MediaMock);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:romanian"), revokeObjectURL: vi.fn() }));
  api = await import("./audio");
});
afterEach(() => { api.stopAudio(); document.getElementById("romana-audio-player")?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Перенесённая архитектура CHAMELEON BG → ro-RO", () => {
  it("готовый MP3 предпочитается Piper и системному голосу; успех наступает только после ended", async () => {
    available = [{ lang: "ro-RO" }]; let finished = false;
    const pending = api.speak("Bună!", .75).then(ok => { finished = true; return ok; });
    await flush(); expect(api.getAudioState()).toMatchObject({ source: "file", status: "playing", duration: 2 });
    expect(finished).toBe(false); expect(instances[0].src).toBe("/audio/buna.mp3"); expect(instances[0].playbackRate).toBe(.75);
    expect(dependencies.piper).not.toHaveBeenCalled(); expect(engine.speak).not.toHaveBeenCalled();
    instances[0].onended?.(); expect(await pending).toBe(true); expect(api.getAudioState().status).toBe("ended");
  });
  it("cafea использует один connected-плеер вне React root и переживает смену карточки/модалки", async () => {
    const root = document.createElement("div"); document.body.appendChild(root);
    api.speak("cafea", 1); await flush(); const audio = document.getElementById("romana-audio-player")!;
    expect(audio.parentElement).toBe(document.body); expect(instances[0].src).toBe("/audio/2b74797589c1dd08c06b07cb.mp3");
    root.replaceChildren(document.createElement("section")); root.remove();
    api.speak("Bună!", 1); await flush();
    expect(instances).toHaveLength(1); expect(document.getElementById("romana-audio-player")).toBe(audio);
    api.stopAudio(); expect(audio.isConnected).toBe(true); expect(instances[0].load).not.toHaveBeenCalled(); expect(instances[0].removeAttribute).not.toHaveBeenCalled();
  });
  it("ошибка MP3 переключает на Piper; один Blob освобождается после завершения", async () => {
    dependencies.piper.mockResolvedValue(new Blob(["MP3"], { type: "audio/mpeg" }));
    const pending = api.speak("Bună!", 1); instances[0].onerror?.(); await flush();
    expect(dependencies.piper).toHaveBeenCalledOnce(); expect(api.getAudioState()).toMatchObject({ status: "playing", source: "server" });
    expect(instances[0].src).toBe("blob:romanian"); instances[0].onended?.(); expect(await pending).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:romanian");
  });
  it("после отсутствующего MP3 и Piper выбирает исключительно настоящий ro-RO", async () => {
    available = [{ lang: "ru-RU" }, { lang: "bg-BG" }, { lang: "en-US" }, { lang: "ro-MD" }, { lang: "ro-RO", name: "Romania" }];
    const pending = api.speak("Frază nouă", 1); await flush();
    expect(dependencies.piper).toHaveBeenCalledBefore(engine.speak);
    const u = engine.speak.mock.calls[0][0]; expect(u).toMatchObject({ lang: "ro-RO", voice: available[4] });
    u.onstart(); expect(api.getAudioState().source).toBe("browser"); u.onend(); expect(await pending).toBe(true);
  });
  it("не подставляет русский, английский, болгарский или ro-MD и выдаёт ошибку", async () => {
    available = [{ lang: "ru-RU" }, { lang: "en-US" }, { lang: "bg-BG" }, { lang: "ro-MD" }]; const notify = vi.fn();
    const pending = api.speak("Неподготовленная фраза", 1, notify); await flush(); await vi.advanceTimersByTimeAsync(601);
    expect(await pending).toBe(false); expect(engine.speak).not.toHaveBeenCalled(); expect(notify).toHaveBeenCalledWith(expect.stringContaining("ro-RO"));
  });
  it("блокировка play не запускает бессмысленный серверный резерв; повтор допускает новый жест", async () => {
    blocked = true; expect(await api.speak("Bună!", 1)).toBe(false); expect(api.getAudioState().error).toContain("Нажмите");
    expect(dependencies.piper).not.toHaveBeenCalled(); blocked = false; api.repeatAudio(); await flush(); expect(api.getAudioState().status).toBe("playing");
  });
  it("актуальный AbortError виден и содержит состояние плеера, а не ложный успех", async () => {
    api.speak("cafea", 1); await flush();
    instances[0].play.mockRejectedValueOnce(new DOMException("media removed", "AbortError"));
    expect(await api.speak("cafea", 1)).toBe(false); expect(api.getAudioState().status).toBe("error");
    expect(api.getAudioState().error).toContain("AbortError"); expect(api.getAudioState().error).toContain("плеер в документе: да");
  });
  it("отмена старого зависшего play и его поздний AbortError не портят новую сессию", async () => {
    api.speak("Bună!", 1); await flush(); let reject!: (e: DOMException) => void;
    instances[0].play.mockImplementationOnce(() => new Promise<void>((_r, fail) => { reject = fail; }));
    const old = api.speak("Bună!", 1); const current = api.speak("cafea", 1); expect(await old).toBe(false);
    reject(new DOMException("media removed", "AbortError")); await flush();
    expect(api.getAudioState()).toMatchObject({ status: "playing", text: "cafea", error: "" }); instances[0].onended?.(); expect(await current).toBe(true);
  });
  it("старые ended/error не снимают обработчики нового воспроизведения", async () => {
    api.speak("Bună!", 1); const ended = instances[0].onended, failed = instances[0].onerror;
    const current = api.speak("cafea", 1); await flush(); ended?.(); failed?.(); await flush();
    expect(api.getAudioState()).toMatchObject({ text: "cafea", status: "playing" }); expect(instances[0].onended).toBeTypeOf("function");
    instances[0].onended?.(); expect(await current).toBe(true);
  });
  it("отмена во время зависшего lookup завершает сессию немедленно и не запускает запоздалый MP3", async () => {
    let resolve!: (url: string) => void; dependencies.resolve.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const pending = api.speak("Новый текст", 1); api.stopAudio(); expect(await pending).toBe(false);
    resolve("/audio/late.mp3"); await flush(); expect(instances[0].play).not.toHaveBeenCalled(); expect(api.getAudioState().status).toBe("idle");
  });
  it("очередь ждёт ended каждой реплики; stop не допускает следующую", async () => {
    const line = vi.fn(); const sequence = api.speakSequence(["Bună!", "cafea", "Bună!"], 1, vi.fn(), line); await flush();
    expect(instances[0].play).toHaveBeenCalledTimes(1); expect(line).toHaveBeenLastCalledWith(0);
    instances[0].onended?.(); await flush(); expect(line).toHaveBeenLastCalledWith(1); expect(instances[0].src).toContain("2b747975");
    api.stopAudio(); await sequence; expect(line).toHaveBeenLastCalledWith(-1); expect(line).not.toHaveBeenCalledWith(2);
  });
  it("остановленная старая очередь не снимает подсветку новой", async () => {
    const first = vi.fn(), second = vi.fn(); const a = api.speakSequence(["Bună!", "cafea"], 1, vi.fn(), first);
    const b = api.speakSequence(["cafea", "Bună!"], 1, vi.fn(), second); await a; await flush();
    expect(second).toHaveBeenLastCalledWith(0); expect(api.getAudioState().text).toBe("cafea"); api.stopAudio(); await b;
  });
  it("пауза сохраняет запись и очередь даже через две минуты; скорость и громкость не перезапускают play", async () => {
    const pending = api.speakSequence(["Bună!", "cafea"], 1); await flush(); api.pauseAudio();
    const before = instances[0].src, calls = instances[0].play.mock.calls.length;
    api.setAudioRate(.75); api.setAudioVolume(.4); expect(instances[0].playbackRate).toBe(.75); expect(instances[0].volume).toBe(.4);
    expect(instances[0].play).toHaveBeenCalledTimes(calls); await vi.advanceTimersByTimeAsync(120000);
    expect(api.getAudioState().status).toBe("paused"); expect(dependencies.piper).not.toHaveBeenCalled();
    await api.resumeAudio(); expect(instances[0].src).toBe(before); expect(api.getAudioState().status).toBe("playing"); api.stopAudio(); await pending;
  });
  it("прогресс длинного диалога продлевает watchdog", async () => {
    api.speak("cafea", 1); await flush();
    for (let i = 0; i < 100; i++) { await vi.advanceTimersByTimeAsync(1000); instances[0].currentTime++; instances[0].ontimeupdate?.(); }
    expect(api.getAudioState().status).toBe("playing"); expect(dependencies.piper).not.toHaveBeenCalled();
  });
  it("зависший файл переходит к Piper по watchdog и повтор снова работает", async () => {
    dependencies.piper.mockResolvedValue(new Blob(["MP3"], { type: "audio/mpeg" })); api.speak("cafea", 1); await flush();
    await vi.advanceTimersByTimeAsync(12001); await flush(); expect(api.getAudioState().source).toBe("server");
    api.stopAudio(); api.speak("cafea", 1); await flush(); expect(api.getAudioState()).toMatchObject({ source: "file", status: "playing" });
  });
  it("отмена зависшего Piper не запускает системный голос и освобождает сессию", async () => {
    dependencies.piper.mockReturnValueOnce(new Promise(() => {})); const pending = api.speak("Bună!", 1); instances[0].onerror?.(); await flush();
    api.stopAudio(); expect(await pending).toBe(false); expect(engine.speak).not.toHaveBeenCalled();
  });
  it("сломанный системный синтезатор не мешает MP3", async () => {
    engine.cancel.mockImplementation(() => { throw Error("OS failure"); }); api.speak("cafea", 1); await flush(); expect(api.getAudioState().status).toBe("playing");
  });
  it("cleanup старого владельца не останавливает новую сессию", async () => {
    api.speak("Bună!", 1); const old = api.audioSessionId(); api.speak("cafea", 1);
    api.stopAudioIfSession(old); await flush(); expect(api.getAudioState()).toMatchObject({ text: "cafea", status: "playing" });
  });
  it("запоздалый resume старого MP3 не выдаёт загрузку Piper за playing", async () => {
    dependencies.piper.mockReturnValueOnce(new Promise(() => {})); api.speak("Bună!", 1); await flush(); api.pauseAudio();
    let complete!: () => void; instances[0].play.mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const pending = api.resumeAudio(); await vi.advanceTimersByTimeAsync(12001); await flush();
    expect(api.getAudioState()).toMatchObject({ source: "server", status: "loading" }); complete(); await pending;
    expect(api.getAudioState()).toMatchObject({ source: "server", status: "loading" });
  });
  it("Android использует native media и не создаёт AudioContext", async () => {
    Object.defineProperty(navigator, "userAgent", { value: "Android 14", configurable: true }); const create = vi.fn(); vi.stubGlobal("AudioContext", create);
    api.speak("cafea", 1); await flush(); expect(create).not.toHaveBeenCalled(); expect(api.getAudioState().status).toBe("playing");
    Object.defineProperty(navigator, "userAgent", { value: "jsdom", configurable: true });
  });
  it("desktop подключает один MediaElementSource → Analyser → destination, без второго графа", async () => {
    const meter = { connect: vi.fn(), fftSize: 0, smoothingTimeConstant: 0 }; const source = { connect: vi.fn(() => meter) };
    class Context { state = "running"; destination = {}; createMediaElementSource = vi.fn(() => source); createAnalyser = vi.fn(() => meter); resume = vi.fn(async () => {}); }
    vi.stubGlobal("AudioContext", Context); api.speak("cafea", 1); await flush(); api.speak("Bună!", 1); await flush();
    expect(source.connect).toHaveBeenCalledTimes(1); expect(meter.connect).toHaveBeenCalledOnce(); expect(api.audioAnalyser()).toBe(meter);
  });
});
