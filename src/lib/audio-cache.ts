// Range responses (206) cannot populate Workbox's full-file cache. Once play()
// has started inside the user's gesture, request a complete response separately.
// Playback never waits for this request and cache failures never stop sound.
const pending = new Map<string, Promise<void>>();
export function cachePlayedAudio(url: string): Promise<void> {
  if (!navigator.serviceWorker?.controller || !navigator.onLine)
    return Promise.resolve();
  const existing = pending.get(url);
  if (existing) return existing;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const task = fetch(url, { signal: controller.signal })
    .then(async (response) => {
      if (response.ok) await response.arrayBuffer();
    })
    .catch(() => {})
    .finally(() => { clearTimeout(timer); pending.delete(url); });
  pending.set(url, task);
  return task;
}
