import { describe, it, expect } from "vitest";
import imported from "../data/imported-vocabulary.json";
import curated from "../data/curated-vocabulary.json";
import { words } from "../data/course";
import { dialogues } from "../data/dialogues";
const key = (s: string) =>
  s.normalize("NFC").toLocaleLowerCase("ro").replace(/^a\s+/, "").trim();
describe("Новые реальные материалы", () => {
  it("импортирует более 6000 уникальных прямых русских статей с provenance", () => {
    expect(imported.length).toBeGreaterThanOrEqual(6000);
    expect(new Set(imported.map((w) => key(w.ro))).size).toBe(imported.length);
    for (const w of imported) {
      expect(w.ru).toBeTruthy();
      expect(w.source.url).toContain("wiktionary.org");
      expect(w.source.license).toBe("CC BY-SA 4.0");
      expect(w.levelEstimated).toBe(true);
      expect(w.quality).toBe("reference");
      expect(w.ro).not.toMatch(/[şţ]/);
    }
  });
  it("содержит 200 новых подготовленных карточек с двумя разными примерами", () => {
    expect(curated).toHaveLength(200);
    expect(new Set(curated.map((w) => w.id)).size).toBe(200);
    for (const w of curated) {
      expect(words.map((w) => key(w.ro))).not.toContain(key(w.ro));
      expect(w.examples).toHaveLength(2);
      expect(w.examples[0].ro).not.toBe(w.examples[1].ro);
      expect(w.examples.every((e) => e.ro && e.ru)).toBe(true);
      expect(w.forms).toBeTruthy();
    }
  });
  it("у каждой новой фотографии есть индивидуальная лицензия и атрибуция", () => {
    const photographed = curated.filter((w) => "image" in w);
    expect(photographed.length).toBeGreaterThanOrEqual(72);
    for (const w of photographed) {
      expect("imageSource" in w).toBe(true);
      if (w.imageSource) {
        expect(w.imageSource.url).toContain("commons.wikimedia.org");
        expect(w.imageSource.licenseUrl).toBeTruthy();
        expect(w.imageSource.attribution).toBeTruthy();
      }
    }
  });
  it("содержит 60 разговорных диалогов с согласованными интерактивными ветками", () => {
    expect(dialogues).toHaveLength(60);
    for (const d of dialogues) {
      expect(d.pairs.length).toBeGreaterThanOrEqual(5);
      expect(d.pairs.every((p) => p.ro && p.ru && p.note)).toBe(true);
      expect(d.turns?.length).toBeGreaterThanOrEqual(1);
      for(const turn of d.turns||[]){expect(d.pairs.some(p=>p.ro===turn.promptRo)).toBe(true);expect(turn.options.length).toBeGreaterThanOrEqual(2);expect(new Set(turn.options.map(o=>o.ro)).size).toBe(turn.options.length);for(const option of turn.options){expect(option.continuation?.length).toBeGreaterThanOrEqual(1);expect(option.continuation.every(p=>p.ro&&p.ru)).toBe(true);}}
    }
  });
});
