// Adapted from CHAMELEON BG scripts/local-tts-plugin.ts. Development/preview
// only; production remains a static deployment of the existing MP3 library.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
export function localRomanianTts(env) {
  let child;
  const origin = env.ROMANA_TTS_ORIGIN || "http://127.0.0.1:8792";
  const start = async () => {
    try {
      const response = await fetch(origin + "/api/tts/health", { signal: AbortSignal.timeout(700) });
      const health = await response.json();
      if (response.ok && health.language === "ro-RO" && health.voice === "Piper/Mihai") return;
    } catch { /* Start the configured existing runtime below. */ }
    const python = env.ROMANA_TTS_PYTHON, model = env.ROMANA_TTS_MODEL;
    if (!python || !model || !existsSync(python) || !existsSync(model)) return;
    child = spawn(python, ["scripts/tts-server.py"], {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, ROMANA_TTS_MODEL: model, ROMANA_TTS_PORT: new URL(origin).port || "8792" },
    });
    child.on("error", () => {});
  };
  return {
    name: "romana-local-piper",
    async configureServer(server) { await start(); server.httpServer?.once("close", () => child?.kill()); },
    async configurePreviewServer(server) { await start(); server.httpServer?.once("close", () => child?.kill()); },
    closeBundle() { child?.kill(); },
  };
}
