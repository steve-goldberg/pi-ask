import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
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

  it("removes the temp draft file on submit", () => {
    const root = mkdtempSync(join(tmpdir(), "grill-me-storage-"));
    const filePath = join(root, "draft.json");

    overwriteDraftFile(filePath, definition, { one: "Alpha" });
    expect(existsSync(filePath)).toBe(true);

    removeDraftFile(filePath);
    expect(existsSync(filePath)).toBe(false);
  });
});
