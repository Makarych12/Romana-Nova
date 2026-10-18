import bootstrap from "../data/audio-bootstrap.json";
import meta from "../data/audio-index-meta.json";
import { audioKey, normalizeAudioText, audioLookupPrefix } from "./audio-text";
export { audioKey, normalizeAudioText } from "./audio-text";
export const audioFileCount = meta.files;
type Part = Record<string, string>;
const starter: Part = bootstrap;
const parts = new Map<string, Promise<Part>>();
const ready = new Map<string, Part>();
const valid = (url: unknown): url is string => typeof url === "string" && /^\/audio\/[a-f0-9]{24}\.mp3$/.test(url);
const lookup = (part: Part, text: string) => {
  const url = part["=" + audioKey(text)] ?? part[normalizeAudioText(text)];
  return valid(url) ? url : undefined;
};
export function audioFileFor(text: string) {
  return lookup(starter, text) ?? lookup(ready.get(audioLookupPrefix(text)) || {}, text);
}
export function prepareAudio(text?: string): Promise<Part> {
  if (!text) return Promise.resolve({}); // No catalog fetch on the home screen.
  const prefix = audioLookupPrefix(text);
  const previous = parts.get(prefix);
  if (previous) { parts.delete(prefix); parts.set(prefix, previous); return previous; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const request = fetch(`${meta.baseUrl}/${prefix}.json`, { signal: controller.signal })
    .then(async response => {
      if (!response.ok) throw Error(`Аудиоиндекс: HTTP ${response.status}`);
      const value: unknown = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Повреждён аудиоиндекс");
      const part = Object.fromEntries(Object.entries(value).filter(([, url]) => valid(url))) as Part;
      if (parts.get(prefix) === request) ready.set(prefix, part);
      return part;
    }).catch(() => { if (parts.get(prefix) === request) parts.delete(prefix); return {}; })
    .finally(() => clearTimeout(timer));
  parts.set(prefix, request);
  while (parts.size > 8) { const oldest = parts.keys().next().value!; parts.delete(oldest); ready.delete(oldest); }
  return request;
}
export async function resolveAudioFile(text: string) {
  const cached = audioFileFor(text);
  return cached ?? lookup(await prepareAudio(text), text);
}
export const audioIndexStats = () => ({ retainedParts: parts.size, readyParts: ready.size, ...meta });
