import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';
import { executeAsk } from '../../extensions/ask/execute.ts';
import { type AskParams, type AskResult, UI_UNAVAILABLE } from '../../extensions/ask/model.ts';

const sampleParams: AskParams = {
  questions: [
    {
      id: 'scope',
      label: 'Scope',
      prompt: 'Who should receive the first rollout?',
      options: [
        { value: 'pilot', label: 'Pilot with one team' },
        { value: 'all', label: 'Roll out to every team now' },
      ],
      recommendationIndex: 0,
    },
  ],
};

function context(
  mode: ExtensionContext['mode'],
  result?: AskResult,
): Pick<ExtensionContext, 'mode' | 'ui' | 'cwd'> {
  return {
    mode,
    cwd: process.cwd(),
    ui: {
      custom: (async () => {
        if (result === undefined) {
          throw new Error('custom UI should not run');
        }
        return result;
      }) as ExtensionContext['ui']['custom'],
    } as ExtensionContext['ui'],
  };
}

test.each(['print', 'json', 'rpc'] as const)('fails closed in %s mode instead of auto-accepting the recommendation', async (mode) => {
  const result = await executeAsk(sampleParams, context(mode));
  assert.equal(result.details.cancelled, true);
  assert.equal(result.content[0]?.text, UI_UNAVAILABLE);
});

test('rejects a recommendationIndex past the option list before opening the UI', async () => {
  const result = await executeAsk(
    {
      questions: [
        {
          id: 'scope',
          prompt: 'Who should receive the first rollout?',
          options: [
            { value: 'pilot', label: 'Pilot with one team' },
            { value: 'all', label: 'Roll out to every team now' },
          ],
          recommendationIndex: 9,
        },
      ],
    },
    context('tui'),
  );
  assert.equal(result.details.cancelled, true);
  assert.match(result.content[0]?.text ?? '', /recommendationIndex 9/);
});

test('rejects an oversized batch before opening the UI', async () => {
  const [question] = sampleParams.questions;
  assert.ok(question);
  const toolResult = await executeAsk(
    {
      questions: Array.from({ length: 5 }, (_, index) => ({
        ...question,
        id: `question-${String(index + 1)}`,
      })),
    },
    context('tui'),
  );

  assert.equal(toolResult.details.cancelled, true);
  assert.equal(
    toolResult.content[0]?.text,
    'Error: A questionnaire batch may include at most 4 questions',
  );
});

test('returns cancelled details when the user dismisses the questionnaire', async () => {
  const result = await executeAsk(
    sampleParams,
    context('tui', { questions: [], answers: [], cancelled: true }),
  );
  assert.equal(result.details.cancelled, true);
  assert.equal(result.content[0]?.text, 'User cancelled the questionnaire');
});

test('returns formatted answers from one completed batch', async () => {
  const captured: AskResult = {
    questions: [],
    answers: [
      {
        id: 'scope',
        value: 'pilot',
        label: 'Pilot with one team',
        wasCustom: false,
        outOfScope: false,
        index: 1,
      },
    ],
    cancelled: false,
  };
  const result = await executeAsk(sampleParams, context('tui', captured));
  assert.equal(result.details.cancelled, false);
  assert.equal(
    result.content[0]?.text,
    'Scope: user selected: 1. Pilot with one team',
  );
});
