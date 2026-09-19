import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { validateScript } from './release.mjs';

const root = new URL('../', import.meta.url);
const content = readFileSync(new URL('build/geometa.user.js', root));
const version = content.toString().match(/^\/\/ @version\s+(.+)$/m)?.[1];
assert.ok(version, 'Missing userscript version');
validateScript(content, version);

for (const path of ['dist/', '../dist/']) {
  const directory = new URL(path, root);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL('geometa.user.js', directory), content);
}
console.log(`Copied local userscript ${version} to both legacy paths`);
