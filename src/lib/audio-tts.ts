// Adapted from CHAMELEON BG playServerAudio. Only a verified Romanian Piper
// endpoint is allowed; a static host simply skips this optional stage.
import { normalizeAudioText, audioLookupPrefix } from "./audio-text";
const cacheKey = (text: string) => `/audio/generated-lookup/${audioLookupPrefix(text)}?text=${encodeURIComponent(normalizeAudioText(text))}`;
export async function rememberPiper(text: string, blob: Blob) {
  if (!("caches" in globalThis)) return;
  try {
    const cache = await caches.open("romana-audio-generated-v1");
    await cache.put(cacheKey(text), new Response(blob, { headers: { "Content-Type": blob.type, "X-Speech-Language": "ro-RO" } }));
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - 256))) await cache.delete(key);
  } catch { /* Quota/storage failure never interrupts speech. */ }
}
export async function requestPiper(text: string, signal: AbortSignal): Promise<Blob | undefined> {
  try {
    if ("caches" in globalThis) {
      const cached = await (await caches.open("romana-audio-generated-v1")).match(cacheKey(text));
      if (cached?.headers.get("X-Speech-Language") === "ro-RO") return await cached.blob();
    }
  } catch { /* The real endpoint remains available. */ }
  if (!navigator.onLine || signal.aborted) return;
  const endpoint = import.meta.env.VITE_ROMANA_TTS_ENDPOINT || "/api/tts";
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const health = await fetch(`${endpoint}/health`, { signal: controller.signal });
    if (!health.ok) return;
    const status = await health.json();
    if (status.language !== "ro-RO" || status.voice !== "Piper/Mihai") return;
    const response = await fetch(`${endpoint}?text=${encodeURIComponent(text)}`, { signal: controller.signal });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/") || response.headers.get("X-Speech-Language") !== "ro-RO") return;
    const blob = await response.blob();
    return blob.size ? blob : undefined;
  } catch { return undefined; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
