// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cachePlayedAudio } from "./audio-cache";
afterEach(() => vi.unstubAllGlobals());
describe("Полный MP3 для офлайн-режима", () => {
  it("после Range-проигрывания запрашивает полный файл без Range и объединяет одновременные запросы", async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: { controller: {} } });
    const body = vi.fn(async () => new ArrayBuffer(100));
    const fetcher = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, arrayBuffer: body }));
    vi.stubGlobal("fetch", fetcher);
    const first = cachePlayedAudio("/audio/test.mp3");
    const second = cachePlayedAudio("/audio/test.mp3");
    await Promise.all([first, second]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty("headers.Range");
    expect(body).toHaveBeenCalledOnce();
  });
  it("офлайн не создаёт лишнего запроса; ошибка кеширования не ломает проигрывание", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("navigator", { onLine: false, serviceWorker: { controller: {} } });
    await cachePlayedAudio("/audio/test.mp3");
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: { controller: {} } });
    await expect(cachePlayedAudio("/audio/test.mp3")).resolves.toBeUndefined();
  });
});
