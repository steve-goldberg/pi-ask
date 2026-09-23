import assert from 'node:assert/strict';
import { stripVTControlCharacters } from 'node:util';
import { test, expect, vi } from 'vitest';
import type { ExtensionUIContext, Theme } from '@earendil-works/pi-coding-agent';
import { CombinedAutocompleteProvider, type Component, type TUI, visibleWidth } from '@earendil-works/pi-tui';
import { normalizeQuestions, type AskParams, type AskResult } from '../../extensions/ask/model.ts';
import { runAskUi } from '../../extensions/ask/ui.ts';

const question: AskParams['questions'][number] = {
  id: 'scope', label: 'Scope', prompt: 'Who should receive the first rollout?',
  options: [
    { value: 'pilot', label: 'One team', description: 'Limit risk while validating.' },
    { value: 'all', label: 'Everyone', description: 'Broader feedback, larger impact.' },
  ], recommendationIndex: 0,
};
const enter = '\r';
const escape = '\x1b';
const tab = '\t';

function snapshot(lines: string[]): string {
  return lines.map((line) => stripVTControlCharacters(line).trimEnd()).join('\n');
}

async function open(questions: AskParams['questions'] = [question]) {
  let component: Component | undefined;
  let completed: AskResult | undefined;
  const ui: Pick<ExtensionUIContext, 'custom'> = {
    custom: (factory) => new Promise((resolve) => {
      const tui = { requestRender() {}, terminal: { rows: 40 } } as unknown as TUI;
      const theme = {
        fg: (_color: string, text: string) => text,
        bg: (_color: string, text: string) => text,
        bold: (text: string) => text,
      } as Theme;
      const created = factory(tui, theme, {} as Parameters<typeof factory>[2], (answer) => {
        completed = answer as AskResult;
        resolve(answer);
      });
      Promise.resolve(created).then((view) => { component = view; });
    }),
  };
  const completion = runAskUi(ui, normalizeQuestions(questions), process.cwd());
  await Promise.resolve();
  assert.ok(component);
  const view = component;
  return {
    completion,
    completed: () => completed,
    press: (...keys: string[]) => keys.forEach((key) => view.handleInput?.(key)),
    render: (width = 80) => { view.invalidate(); return view.render(width); },
    renderWithoutInvalidation: () => view.render(80),
  };
}

test('single question renders only the questionnaire and submits the selected value', async () => {
  const screen = await open();
  expect(snapshot(screen.render())).toMatchSnapshot();
  screen.press('2');
  const answer = await screen.completion;
  assert.equal(answer.cancelled, false);
  assert.equal(answer.answers[0]?.value, 'all');
  assert.equal(answer.answers[0]?.index, 2);
});

test('batch requires every answer, permits revision, then explicitly submits', async () => {
  const screen = await open([question, { ...question, id: 'timing', label: 'Timing' }]);
  screen.press(tab, tab, enter);
  assert.equal(screen.completed(), undefined);
  assert.match(screen.render().join('\n'), /Answer Scope, Timing to continue/);
  screen.press(tab, '1', '2');
  expect(snapshot(screen.render())).toMatchSnapshot();
  assert.equal(screen.completed(), undefined);
  screen.press(tab, '2', tab, enter);
  assert.deepEqual((await screen.completion).answers.map((answer) => answer.value), ['all', 'all']);
});

test('multiple selection requires an explicit choice and supports toggling', async () => {
  const { id, label, prompt, options } = question;
  const screen = await open([{ id, label, prompt, options, selectionMode: 'multiple', recommendedIndices: [0] }]);
  screen.press(enter);
  assert.equal(screen.completed(), undefined);
  screen.press('1', '2', '1');
  expect(snapshot(screen.render())).toMatchSnapshot();
  screen.press(enter);
  assert.deepEqual((await screen.completion).answers[0]?.selections?.map((choice) => choice.value), ['all']);
});

test('custom answers use the real editor; escape backs out without submitting', async () => {
  const screen = await open();
  screen.press('4');
  assert.match(screen.render().join('\n'), /Custom answer/);
  screen.press('discard me', escape);
  assert.equal(screen.completed(), undefined);
  screen.press('4', 'Only internal testers');
  expect(snapshot(screen.render())).toMatchSnapshot();
  screen.press(enter);
  const answer = (await screen.completion).answers[0];
  assert.equal(answer?.wasCustom, true);
  assert.equal(answer?.value, 'Only internal testers');
});

test('out-of-scope is explicit; cancellation retains but does not submit partial answers', async () => {
  const outside = await open();
  outside.press('3');
  assert.equal((await outside.completion).answers[0]?.outOfScope, true);
  const batch = await open([question, { ...question, id: 'next' }]);
  batch.press('1', escape);
  const cancelled = await batch.completion;
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.answers.length, 1);
});

test('async file menu renders without invalidation; Enter completes before submitting', async () => {
  vi.spyOn(CombinedAutocompleteProvider.prototype, 'getSuggestions').mockResolvedValue({
    prefix: '@REA', items: [{ value: '@README.md', label: 'README.md' }],
  });
  const screen = await open();
  screen.press('4', '@REA');
  screen.renderWithoutInvalidation();
  await vi.waitFor(() => assert.match(screen.renderWithoutInvalidation().join('\n'), /README.md/));
  screen.press(enter);
  assert.equal(screen.completed(), undefined);
  screen.press(enter);
  assert.match((await screen.completion).answers[0]?.value ?? '', /@README.md/);
});

test('Escape dismisses the completion menu before leaving the custom editor', async () => {
  vi.spyOn(CombinedAutocompleteProvider.prototype, 'getSuggestions').mockResolvedValue({
    prefix: '@REA', items: [{ value: '@README.md', label: 'README.md' }],
  });
  const screen = await open();
  screen.press('4', '@REA');
  await vi.waitFor(() => assert.match(screen.renderWithoutInvalidation().join('\n'), /README.md/));
  screen.press(escape);
  assert.match(screen.renderWithoutInvalidation().join('\n'), /Custom answer/);
  screen.press(escape);
  assert.doesNotMatch(screen.renderWithoutInvalidation().join('\n'), /Custom answer/);
  screen.press(escape);
  assert.equal((await screen.completion).cancelled, true);
});

test('narrow and wide renders fit their terminal widths, including custom editor', async () => {
  const screen = await open([{ ...question, prompt: 'Which deployment should receive the international rollout? 日本語' }]);
  for (const width of [24, 40, 80, 120]) {
    assert.ok(screen.render(width).every((line) => visibleWidth(line) <= width));
  }
  screen.press('4', 'Some custom text');
  for (const width of [24, 40, 80, 120]) {
    assert.ok(screen.render(width).every((line) => visibleWidth(line) <= width));
  }
  screen.press(escape, escape);
  await screen.completion;
});
