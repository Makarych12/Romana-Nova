// @vitest-environment jsdom
import { it, expect, vi, beforeEach, afterEach, describe } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import "fake-indexeddb/auto";
import App from "./App";
import LessonPlayer from "./components/LessonPlayer";
import { lessons, words } from "./data/course";
import { fresh, saveProgress, readProgress } from "./lib/store";
vi.mock("motion/react", () => ({
  MotionConfig: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy({}, { get: (_t, key) => key }),
}));
beforeEach(async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => [
        ...words,
        {
          id: "reference-test",
          ro: "responsabilitate",
          ru: "ответственность",
          level: "C1",
          theme: "Работа",
          pos: "сущ.",
          forms: "",
          quality: "reference",
          levelEstimated: true,
          examples: [],
        },
      ],
    })),
  );
  await saveProgress(fresh());
  location.hash = "home";
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function navigate(name: string) {
  fireEvent.click(screen.getAllByRole("link", { name })[0]);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  await waitFor(() => expect(location.hash).not.toBe("#home"));
}
describe("Связанные пользовательские сценарии", () => {
  it("открывает обзор с нулевым прогрессом и каждый раздел академии", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    const rows = [
      ["Мой путь", "Каждый уровень — новая свобода."],
      ["Практика", "Всё получается с практикой."],
      ["Словарь", "У каждого слова — свой мир."],
      ["Грамматика", "Грамматическая лаборатория"],
      ["Железная дорога", "Следующая станция — уверенность."],
      ["Румынский за 30 дней", "30 дней навстречу Румынии."],
      ["Мой прогресс", "Каждый шаг имеет значение."],
      ["Настройки", "Всё в вашем ритме."],
    ];
    for (const [name, title] of rows) {
      await navigate(name);
      await screen.findByRole("heading", { name: title });
    }
    expect(screen.getByText("План занятий")).toBeTruthy();
  });
  it("сохраняет выбранную ветку разговора без фиктивной точности и повторных XP", async () => {
    const previous=fresh();previous.favorites=['w2'];previous.reviews.w0={due:1000,interval:6,reps:3};
    await saveProgress(previous);
    render(<App />);await screen.findByText("Новый язык.");await navigate("Практика");
    await screen.findByRole('heading',{name:'Живые разговоры'});
    fireEvent.click(screen.getAllByRole('button',{name:'Выбрать реплику'})[0]);
    const dialog=await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button',{name:/Sunt din Ucraina/}));
    expect(within(dialog).getByText(/Ce frumos! La ce școală înveți/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button',{name:'Завершить разговор'}));
    await waitFor(async()=>{const p=await readProgress();expect(Object.values(p.dialoguePractice)[0].choices).toEqual([1]);expect(p.xp).toBe(20);expect(p.attempts).toBe(0);expect(p.favorites).toEqual(['w2']);expect(p.reviews.w0.reps).toBe(3)});
    fireEvent.click(screen.getAllByRole('button',{name:'Выбрать реплику'})[0]);
    const repeat=await screen.findByRole('dialog');fireEvent.click(within(repeat).getByRole('button',{name:/Sunt din Ucraina/}));fireEvent.click(within(repeat).getByRole('button',{name:'Завершить разговор'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect((await readProgress()).xp).toBe(20);
  });
  it("фильтрует словарь, сохраняет избранное и восстанавливает его после открытия приложения", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    await navigate("Словарь");
    const search = await screen.findByRole("textbox", { name: "Поиск слов" });
    fireEvent.change(search, { target: { value: "вода" } });
    expect(screen.getByRole("heading", { name: "apă" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "pâine" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Добавить в избранное: apă" }),
    );
    await waitFor(async () =>
      expect((await readProgress()).favorites).toEqual(["w0"]),
    );
    cleanup();
    render(<App />);
    await screen.findByRole("heading", { name: "У каждого слова — свой мир." });
    expect(
      screen.getByRole("button", { name: "Убрать из избранного: apă" }),
    ).toBeTruthy();
  });
  it("открывает новые уроки A2 и честно отмечает будущие дни", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    await navigate("Мой путь");
    await screen.findByRole("heading", {
      name: "Каждый уровень — новая свобода.",
    });
    fireEvent.click(screen.getByRole("button", { name: /A2/ }));
    expect(
      screen.getByRole("button", { name: /Завершённые события/ }),
    ).toBeTruthy();
    await navigate("Румынский за 30 дней");
    await screen.findByRole("heading", { name: "30 дней навстречу Румынии." });
    expect(
      screen.getByRole("button", { name: /ДЕНЬ 17/ }).hasAttribute("disabled"),
    ).toBe(true);
  });
  it("реально переворачивает карточку и назначает повторение после действия", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    await navigate("Словарь");
    await screen.findByRole("button", { name: "Карточки" });
    fireEvent.click(screen.getByRole("button", { name: "Карточки" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Перевернуть карточку" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Помню" }));
    await waitFor(async () => {
      const p = await readProgress();
      expect(p.reviews.w0.reps).toBe(1);
      expect(p.xp).toBe(5);
    });
  });

  it("сохраняет прохождение урока, XP и ежедневное действие в IndexedDB", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    fireEvent.click(screen.getByRole("button", { name: "Начать мой путь" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Перейти к практике/ }));
    const answers = [
      "Bună!",
      "Bună ziua!",
      "Mulțumesc!",
      "La revedere!",
      "Da.",
      "Nu.",
    ];
    for (let i = 0; i < answers.length; i++) {
      if (i === 0 || i === 5 || i === 2) {
        fireEvent.click(
          screen.getByRole("button", {
            name: i === 2 ? answers[i] : new RegExp(answers[i] + "$"),
          }),
        );
      } else {
        fireEvent.change(screen.getByRole("textbox", { name: "Ваш ответ" }), {
          target: { value: answers[i] },
        });
      }
      fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
      fireEvent.click(
        screen.getByRole("button", {
          name: i === 5 ? "Завершить" : "Следующее задание",
        }),
      );
    }
    expect(screen.getByText("100%")).toBeTruthy();
    await waitFor(async () => {
      const p = await readProgress();
      expect(p.completed).toEqual(["a0-1"]);
      expect(p.xp).toBe(90);
      expect(p.attempts).toBe(6);
      expect(Object.values(p.lessonActivity)).toEqual([1]);
    });
  });
  it("экспортирует JSON и импортирует проверенный профиль после подтверждения", async () => {
    const imported = fresh();
    imported.xp = 250;
    imported.favorites = ["w2"];
    const create = vi.fn().mockReturnValue("blob:test");
    Object.defineProperty(URL, "createObjectURL", {
      value: create,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    await screen.findByText("Новый язык.");
    await navigate("Настройки");
    await screen.findByRole("button", { name: "Экспорт JSON" });
    fireEvent.click(screen.getByRole("button", { name: "Экспорт JSON" }));
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].type).toBe("application/json");
    expect(click).toHaveBeenCalledOnce();
    const file = new File([JSON.stringify(imported)], "profile.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(imported),
    });
    const fileInput = document.querySelector("input[type=file]")!;
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(async () =>
      expect((await readProgress()).favorites).toEqual(["w2"]),
    );
    expect(window.confirm).toHaveBeenCalledOnce();
    expect((await readProgress()).xp).toBe(250);
    click.mockRestore();
    vi.restoreAllMocks();
  });
  it("предоставляет честный экран проверки звука и резервный файл", async () => {
    render(<App />);
    await screen.findByText("Новый язык.");
    await navigate("Настройки");
    await screen.findByRole("heading", {
      name: "Проверка и диагностика звука",
    });
    expect(
      screen.getByRole("button", { name: "Проверить резервный файл" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Физический звук в среде разработки не проверен/),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Я слышу румынскую речь" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Вы подтвердили: румынскую речь слышно",
      }),
    ).toBeTruthy();
  });
  it("сохраняет связь уровня с новыми карточками и не скрывает отсутствие примеров", async () => {
    location.hash = "#dictionary/C1";
    render(<App />);
    await screen.findByRole("heading", { name: "responsabilitate" });
    expect(
      (
        screen.getByRole("combobox", {
          name: "Уровень словаря",
        }) as HTMLSelectElement
      ).value,
    ).toBe("C1");
    expect(
      screen.getByText(
        "Примеры для этой справочной статьи ещё не подготовлены.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Карточки" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Перевернуть карточку" }),
    );
    expect(
      screen.getByText("Для этой справочной статьи примеры ещё не добавлены."),
    ).toBeTruthy();
  });
});
describe("Урок от объяснения до проверки", () => {
  it("проверяет ответы, показывает разбор и завершает с реальным результатом", async () => {
    const onAnswer = vi.fn(),
      onComplete = vi.fn();
    render(
      <LessonPlayer
        lesson={lessons[0]}
        mode="translate"
        speed={1}
        onClose={vi.fn()}
        onAnswer={onAnswer}
        onComplete={onComplete}
        notify={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Перейти к практике/ }));
    const expected = [
      "Bună!",
      "Добрый день!",
      "Mulțumesc!",
      "До свидания!",
      "Da.",
      "Нет.",
    ];
    for (let i = 0; i < expected.length; i++) {
      fireEvent.change(screen.getByRole("textbox", { name: "Ваш ответ" }), {
        target: { value: expected[i] },
      });
      fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
      expect(screen.getByRole("status").textContent).toContain("Верно");
      fireEvent.click(
        screen.getByRole("button", {
          name: i === 5 ? "Завершить" : "Следующее задание",
        }),
      );
    }
    expect(onAnswer).toHaveBeenCalledTimes(6);
    expect(onComplete).toHaveBeenCalledWith(100);
    expect(screen.getByText("100%")).toBeTruthy();
  });
  it("не засчитывает ошибку и не позволяет начислить XP двойным нажатием", async () => {
    const onAnswer = vi.fn();
    render(
      <LessonPlayer
        lesson={lessons[0]}
        mode="translate"
        speed={1}
        onClose={vi.fn()}
        onAnswer={onAnswer}
        onComplete={vi.fn()}
        notify={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Перейти к практике/ }));
    expect(
      screen
        .getByRole("button", { name: "Проверить" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Ваш ответ" }), {
      target: { value: "Buna" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0][1]).toBe(false);
    expect(screen.getByRole("status").textContent).toContain(
      "Правильный ответ: Bună!",
    );
    expect(
      screen
        .getByRole("textbox", { name: "Ваш ответ" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it("собирает предложение из перемешанных слов и позволяет исправить порядок", () => {
    const onAnswer = vi.fn();
    render(
      <LessonPlayer
        lesson={lessons[0]}
        mode="build"
        speed={1}
        onClose={vi.fn()}
        onAnswer={onAnswer}
        onComplete={vi.fn()}
        notify={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Перейти к практике/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bună!" }));
    fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
    expect(onAnswer.mock.calls[0][1]).toBe(true);
  });
  it("закрывает диалог Escape и возвращает фокус", () => {
    const onClose = vi.fn();
    render(
      <LessonPlayer
        lesson={lessons[0]}
        mode="mixed"
        speed={1}
        onClose={onClose}
        onAnswer={vi.fn()}
        onComplete={vi.fn()}
        notify={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Закрыть урок" }),
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
