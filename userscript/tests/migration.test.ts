import { afterEach, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createManifest } from '../scripts/release.mjs';
import { scriptFixture, sourceCommit } from './fixtures/release';

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'geometa-migration-'));
  temporaryDirectories.push(root);
  const userscript = join(root, 'userscript');
  const artifact = join(root, 'artifact');
  for (const path of ['dist', 'userscript/dist', 'userscript/scripts', 'artifact']) {
    mkdirSync(join(root, path), { recursive: true });
  }
  for (const name of ['release.mjs', 'adopt-migration.mjs']) {
    copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(userscript, 'scripts', name));
  }
  const previous = '// @version 0.95\n';
  const bundles = [join(root, 'dist/geometa.user.js'), join(userscript, 'dist/geometa.user.js')];
  for (const path of bundles) writeFileSync(path, previous);
  const manifest = createManifest(scriptFixture, '0.96', sourceCommit, '123', '1');
  writeFileSync(join(artifact, 'geometa.user.js'), scriptFixture);
  writeFileSync(join(artifact, 'manifest.json'), JSON.stringify(manifest));

  return {
    artifact,
    bundles,
    previous,
    run(liveContent = scriptFixture, status = 200) {
      const fetchMock = join(root, 'fetch.mjs');
      writeFileSync(
        fetchMock,
        `globalThis.fetch = async () => new Response(${JSON.stringify(liveContent)}, { status: ${status} });\n`
      );
      return spawnSync(
        'node',
        ['--import', fetchMock, join(userscript, 'scripts/adopt-migration.mjs'), artifact],
        { encoding: 'utf8', timeout: 10000 }
      );
    }
  };
}

test('adopts exact deployed artifact', () => {
  const context = setup();
  const result = context.run();
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  for (const path of context.bundles) expect(readFileSync(path, 'utf8')).toBe(scriptFixture);
});

test.each([
  { name: 'unavailable Pages', live: 'Not Found', status: 404 },
  { name: 'different Pages bytes', live: `${scriptFixture}\n`, status: 200 }
])('refuses $name without changing legacy files', ({ live, status }) => {
  const context = setup();
  expect(context.run(live, status).status).not.toBe(0);
  for (const path of context.bundles) expect(readFileSync(path, 'utf8')).toBe(context.previous);
});

test('refuses artifact checksum mismatch before writing', () => {
  const context = setup();
  writeFileSync(join(context.artifact, 'geometa.user.js'), `${scriptFixture}\n`);
  expect(context.run().status).not.toBe(0);
  for (const path of context.bundles) expect(readFileSync(path, 'utf8')).toBe(context.previous);
});
