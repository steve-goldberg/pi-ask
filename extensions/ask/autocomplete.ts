import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { getAgentDir } from '@earendil-works/pi-coding-agent';
import { CombinedAutocompleteProvider } from '@earendil-works/pi-tui';

export function resolveFdBinary(): string | null {
  const names = process.platform === 'win32' ? ['fd.exe', 'fdfind.exe'] : ['fd', 'fdfind'];
  const directories = [join(getAgentDir(), 'bin'), ...(process.env.PATH ?? '').split(delimiter).filter(Boolean)];
  for (const directory of directories) {
    for (const name of names) {
      const candidate = join(directory, name);
      try {
        accessSync(candidate, constants.X_OK);
        if (statSync(candidate).isFile()) {
          return candidate;
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT' && code !== 'ENOTDIR' && code !== 'EACCES') {
          throw error;
        }
      }
    }
  }
  return null;
}

export function createAnswerAutocomplete(cwd: string): CombinedAutocompleteProvider {
  return new CombinedAutocompleteProvider([], cwd, resolveFdBinary());
}
