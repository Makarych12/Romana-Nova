// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const sw = vi.hoisted(() => ({ refresh: vi.fn(), ready: undefined as (() => void) | undefined }));
vi.mock("virtual:pwa-register", () => ({
  registerSW: (options: { onNeedRefresh: () => void }) => {
    sw.ready = options.onNeedRefresh;
    return sw.refresh;
  },
}));
import AppUpdate from "./AppUpdate";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("ждёт сохранения прогресса перед активацией нового service worker", async () => {
  let saved = false;
  sw.refresh.mockImplementation(async () => expect(saved).toBe(true));
  render(<AppUpdate notify={vi.fn()} beforeUpdate={async () => { saved = true; }} />);
  act(() => sw.ready?.());
  fireEvent.click(screen.getByRole("button", { name: "Сохранить прогресс и обновить" }));
  await waitFor(() => expect(sw.refresh).toHaveBeenCalledWith(true));
});
it("не перезагружает страницу при отказе сохранения профиля", async () => {
  const notify = vi.fn();
  render(<AppUpdate notify={notify} beforeUpdate={async () => { throw Error("IndexedDB unavailable"); }} />);
  act(() => sw.ready?.());
  fireEvent.click(screen.getByRole("button", { name: "Сохранить прогресс и обновить" }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining("не удалось сохранить прогресс")));
  expect(sw.refresh).not.toHaveBeenCalled();
});
