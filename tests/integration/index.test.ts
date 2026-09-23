import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'vitest';
import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import registerAsk, { ASK_PROMPT_GUIDELINES } from '../../extensions/ask/index.ts';

function registeredTool(): ToolDefinition {
  const tools: ToolDefinition[] = [];
  // A deliberately minimal API: any attempt to register a hook, shortcut,
  // command, board, or another integration fails instead of being ignored.
  registerAsk({ registerTool: (tool: ToolDefinition) => tools.push(tool) } as unknown as ExtensionAPI);
  assert.equal(tools.length, 1);
  return tools[0]!;
}

test('registers only ask, sequentially, without unrelated instructions', () => {
  const tool = registeredTool();
  assert.equal(tool.name, 'ask');
  assert.equal(tool.executionMode, 'sequential');
  assert.deepEqual(tool.promptGuidelines, ASK_PROMPT_GUIDELINES);
  const guidelines = ASK_PROMPT_GUIDELINES.join('\n');
  assert.match(guidelines, /grill skill/);
  assert.match(guidelines, /language the user is speaking/);
  assert.doesNotMatch(guidelines, /sideroom|architecture skill|before implementing|board|persona/);
});

test('prepares stringified questions before execute sees native arrays', () => {
  const questions = [{
    id: 'scope', prompt: 'Who should receive the first rollout?',
    options: [{ value: 'pilot', label: 'One team' }, { value: 'all', label: 'Everyone' }],
    recommendationIndex: 0,
  }];
  const tool = registeredTool();
  assert.ok(tool.prepareArguments);
  assert.deepEqual(tool.prepareArguments({ questions: JSON.stringify(questions) }), { questions });
});

test('package exposes exactly one tool entry and one self-contained skill', () => {
  const root = new URL('../../', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.deepEqual(manifest.pi, {
    extensions: ['./extensions/ask/index.ts'], skills: ['./skills/grill'],
  });
  assert.deepEqual(readdirSync(new URL('extensions', root)), ['ask']);
  assert.deepEqual(readdirSync(new URL('skills', root)), ['grill']);
  const skill = readFileSync(new URL('skills/grill/SKILL.md', root), 'utf8');
  assert.match(skill, /name: grill/);
  assert.match(skill, /`ask` tool/);
  assert.match(skill, /Wait for\s+the returned answers/);
  assert.match(skill, /cancelled, stop the interview/);
  assert.match(skill, /only when the user explicitly requests it/);
  assert.doesNotMatch(skill, /sideroom-|references\//);
});
