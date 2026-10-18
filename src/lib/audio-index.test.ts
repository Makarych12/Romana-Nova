import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioKey, normalizeAudioText, audioLookupPrefix } from "./audio-text";
import manifest from "../data/audio-manifest.json";
import meta from "../data/audio-index-meta.json";
import { words } from "../data/course";
const files: Record<string, string> = manifest;
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
beforeEach(() => vi.resetModules());
describe("Румынский индекс по образцу CHAMELEON BG", () => {
  it("сохраняет все румынские буквы, нормализуя только Unicode, пробелы и регистр", () => {
    expect(normalizeAudioText("  ÎNVĂȚ\n ROMÂNĂ! ".normalize("NFD"))).toBe("învăț română!");
    for (const [a, b] of [["fata", "fată"], ["și", "şi"], ["țară", "ţară"], ["in", "în"], ["a", "â"]]) expect(normalizeAudioText(a)).not.toBe(normalizeAudioText(b));
    expect(audioKey("  cafea  ")).toBe("cafea"); expect(audioLookupPrefix("CAFEA")).toBe(audioLookupPrefix("cafea"));
  });
  it("не запрашивает индекс на главной; cafea уже есть в небольшом bootstrap", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); const api = await import("./audio-index");
    await api.prepareAudio(); expect(fetcher).not.toHaveBeenCalled();
    expect(await api.resolveAudioFile(" CAFEa ")).toBe(files.cafea); expect(fetcher).not.toHaveBeenCalled();
  });
  it("загружает одну нужную часть, объединяет запросы и ограничивает кеш восемью частями", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    const api = await import("./audio-index"); await Promise.all([api.prepareAudio("неизвестное"), api.prepareAudio("неизвестное")]); expect(fetch).toHaveBeenCalledTimes(1);
    const prefixes = new Set<string>();
    for (let i = 0; prefixes.size < 12; i++) { const text = `probe${i}`; if (prefixes.has(audioLookupPrefix(text))) continue; prefixes.add(audioLookupPrefix(text)); await api.prepareAudio(text); }
    expect(api.audioIndexStats().retainedParts).toBe(8); expect(api.audioIndexStats().readyParts).toBeLessThanOrEqual(8);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(meta.baseUrl);
  });
  it("после HTTP ошибки допускает повтор и не принимает произвольный адрес за MP3", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ 'новое': 'https://bad.invalid/audio.mp3' }) });
    vi.stubGlobal("fetch", fetcher); const api = await import("./audio-index"); expect(await api.resolveAudioFile("новое")).toBeUndefined(); expect(await api.resolveAudioFile("новое")).toBeUndefined(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("20 карточек и 10 предложений сохраняют пути уже существующих MP3", async () => {
    const rows: Record<string, string> = {}; for (const [text, url] of Object.entries(files)) { rows['=' + audioKey(text)] = url; rows[normalizeAudioText(text)] = url; }
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => rows })));
    const api = await import("./audio-index");
    for (const text of [...words.slice(0, 20).map(w => w.ro), ...words.flatMap(w => w.examples).slice(0, 10).map(e => e.ro)]) expect(await api.resolveAudioFile(text)).toBe(files[audioKey(text)]);
  });
});
