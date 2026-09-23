import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { createAnswerAutocomplete, resolveFdBinary } from '../../extensions/ask/autocomplete.ts';

let sandbox: string;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'ask-autocomplete-'));
  vi.stubEnv('PI_CODING_AGENT_DIR', join(sandbox, 'agent'));
  vi.stubEnv('PATH', join(sandbox, 'bin'));
  mkdirSync(join(sandbox, 'agent', 'bin'), { recursive: true });
  mkdirSync(join(sandbox, 'bin'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(sandbox, { recursive: true, force: true });
});

function executable(directory: string, name: string): string {
  const path = join(directory, process.platform === 'win32' ? `${name}.exe` : name);
  writeFileSync(path, '');
  chmodSync(path, 0o755);
  return path;
}

test('prefers Pi-managed fd, then searches PATH for fd or fdfind', () => {
  const systemFd = executable(join(sandbox, 'bin'), 'fdfind');
  assert.equal(resolveFdBinary(), systemFd);
  const managedFd = executable(join(sandbox, 'agent', 'bin'), 'fd');
  assert.equal(resolveFdBinary(), managedFd);
});

test('missing fd leaves ordinary path completion available in the session cwd', async () => {
  assert.equal(resolveFdBinary(), null);
  writeFileSync(join(sandbox, 'example file.md'), 'fixture');
  const provider = createAnswerAutocomplete(sandbox);
  const prefix = './example';
  const suggestions = await provider.getSuggestions([prefix], 0, prefix.length, {
    signal: new AbortController().signal, force: true,
  });
  assert.ok(suggestions?.items.some((item) => item.value.includes('example file.md')));
});

test('does not treat a directory named fd as an executable', () => {
  mkdirSync(join(sandbox, 'bin', process.platform === 'win32' ? 'fd.exe' : 'fd'));
  assert.equal(resolveFdBinary(), null);
});
