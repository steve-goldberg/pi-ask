import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, vi } from 'vitest';
import { DefaultResourceLoader, SettingsManager } from '@earendil-works/pi-coding-agent';

// Use Pi's real package/resource loader with isolated settings; never load or
// modify the operator's global installation while testing this package.
test('Pi discovers only ask and grill from the package manifest', async () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'ask-discovery-'));
  vi.stubEnv('HOME', sandbox);
  try {
    const packagePath = fileURLToPath(new URL('../../', import.meta.url));
    const loader = new DefaultResourceLoader({
      cwd: sandbox,
      agentDir: join(sandbox, 'agent'),
      settingsManager: SettingsManager.inMemory({ packages: [packagePath] }),
      noContextFiles: true,
    });
    await loader.reload({ resolveProjectTrust: async () => true });
    const loaded = loader.getExtensions();
    assert.deepEqual(loaded.errors, []);
    assert.equal(loaded.extensions.length, 1);
    const extension = loaded.extensions[0]!;
    assert.deepEqual([...extension.tools.keys()], ['ask']);
    for (const registrations of [extension.handlers, extension.commands, extension.flags, extension.shortcuts]) {
      assert.equal(registrations.size, 0);
    }
    const skills = loader.getSkills();
    assert.deepEqual(skills.diagnostics, []);
    assert.deepEqual(skills.skills.map((skill) => skill.name), ['grill']);
    assert.equal(loader.getPrompts().prompts.length, 0);
    assert.equal(loader.getThemes().themes.length, 0);
  } finally {
    vi.unstubAllEnvs();
    rmSync(sandbox, { recursive: true, force: true });
  }
});
