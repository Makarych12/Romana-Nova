// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import LessonPlayer from "./LessonPlayer";
import { lessons } from "../data/course";
import { speak, stopAudio, getAudioState } from "../lib/audio";
vi.mock("motion/react", () => ({ motion: new Proxy({}, { get: (_t, key) => key }) }));
afterEach(() => { stopAudio(); cleanup(); document.getElementById("romana-audio-player")?.remove(); vi.unstubAllGlobals(); });
it("React StrictMode, рендер и закрытие модалки не уничтожают новый звук", async () => {
  const created: HTMLAudioElement[] = [];
  vi.stubGlobal("Audio", class {
    constructor() {
      const audio = document.createElement("audio"); created.push(audio);
      vi.spyOn(audio, "play").mockImplementation(async () => { if (!audio.isConnected) throw new DOMException("media removed", "AbortError"); audio.dispatchEvent(new Event("playing")); });
      vi.spyOn(audio, "pause").mockImplementation(() => {});
      return audio;
    }
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  const props = { lesson: lessons[0], mode: "listen" as const, speed: 1, onClose: vi.fn(), onAnswer: vi.fn(), onComplete: vi.fn(), notify: vi.fn() };
  const view = render(<StrictMode><LessonPlayer {...props} /></StrictMode>);
  act(() => { void speak("cafea", 1); });
  expect(getAudioState()).toMatchObject({ text: "cafea", status: "playing" });
  view.rerender(<StrictMode><LessonPlayer {...props} speed={.75} /></StrictMode>);
  act(() => { void speak("apă", 1); });
  view.unmount();
  expect(getAudioState()).toMatchObject({ text: "apă", status: "playing", error: "" });
  expect(created).toHaveLength(1); expect(created[0].parentElement).toBe(document.body);
  await act(async () => { created[0].currentTime = .25; created[0].dispatchEvent(new Event("timeupdate")); created[0].dispatchEvent(new Event("ended")); });
  expect(getAudioState().status).toBe("ended"); expect(getAudioState().timeUpdates).toBe(1);
});
