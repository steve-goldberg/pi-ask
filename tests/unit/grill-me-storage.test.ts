import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDraftPersistenceManager,
  overwriteDraftFile,
  readDraftFile,
  removeDraftFile,
  resolveDraftPath,
  updateDraftFile,
} from "../../.pi/extensions/grill-me/storage.js";

const definition = {
  title: "Example",
  questions: [
    { id: "one", question: "Question one?", multiline: false },
    { id: "two", question: "Question two?", multiline: false },
  ],
};

const createdPaths: string[] = [];

afterEach(() => {
  vi.useRealTimers();
  for (const path of createdPaths.splice(0)) {
    removeDraftFile(path);
  }
});

describe("grill-me storage", () => {
  it("resolves the default draft path inside the project", () => {
    expect(resolveDraftPath("/repo")).toBe("/repo/.pi/tmp/grill-me.json");
  });

  it("overwrites and updates the temp draft file", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-storage-"));
    const filePath = join(root, "draft.json");
    createdPaths.push(filePath);

    overwriteDraftFile(filePath, definition);
    expect(readDraftFile(filePath)).toMatchObject({
      title: "Example",
      responses: [
        { id: "one", answer: "" },
        { id: "two", answer: "" },
      ],
    });

    updateDraftFile(filePath, definition, { one: "Alpha", two: "Beta" });
    expect(readDraftFile(filePath)).toMatchObject({
      title: "Example",
      responses: [
        { id: "one", answer: "Alpha" },
        { id: "two", answer: "Beta" },
      ],
    });
  });

  it("debounces draft persistence during typing and flushes on demand", () => {
    vi.useFakeTimers();

    const root = mkdtempSync(join(tmpdir(), "grill-me-storage-"));
    const filePath = join(root, "draft.json");
    createdPaths.push(filePath);

    overwriteDraftFile(filePath, definition);

    const manager = createDraftPersistenceManager({
      filePath,
      definition,
      debounceMs: 100,
    });

    manager.schedule({ one: "A", two: "" });
    manager.schedule({ one: "Al", two: "" });
    manager.schedule({ one: "Alp", two: "" });

    expect(readDraftFile(filePath)).toMatchObject({
      responses: [
        { id: "one", answer: "" },
        { id: "two", answer: "" },
      ],
    });

    vi.advanceTimersByTime(100);
    expect(readDraftFile(filePath)).toMatchObject({
      responses: [
        { id: "one", answer: "Alp" },
        { id: "two", answer: "" },
      ],
    });

    manager.schedule({ one: "Alpha", two: "Be" });
    manager.flush({ one: "Alpha", two: "Beta" });
    expect(readDraftFile(filePath)).toMatchObject({
      responses: [
        { id: "one", answer: "Alpha" },
        { id: "two", answer: "Beta" },
      ],
    });

    manager.dispose();
  });

  it("removes the temp draft file when asked", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-storage-"));
    const filePath = join(root, "draft.json");

    overwriteDraftFile(filePath, definition, { one: "Alpha" });
    expect(existsSync(filePath)).toBe(true);

    removeDraftFile(filePath);
    expect(existsSync(filePath)).toBe(false);
  });
});
