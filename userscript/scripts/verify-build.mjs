import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createManifest, validateScript } from './release.mjs';

const root = new URL('../', import.meta.url);
const content = readFileSync(new URL('build/geometa.user.js', root));
const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');
const version = changelog.match(/^## \[([\d.]+)\]/m)?.[1];
assert.ok(version, 'Missing changelog version');
validateScript(content, version);

if (process.argv.includes('--manifest')) {
  assert.match(process.env.GITHUB_REF, /^refs\/heads\/.+$/, 'Expected branch ref');
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  const manifest = createManifest(
    content,
    version,
    process.env.GITHUB_SHA,
    process.env.GITHUB_RUN_ID,
    process.env.GITHUB_RUN_ATTEMPT,
    process.env.GITHUB_REPOSITORY
  );
  writeFileSync(new URL('build/manifest.json', root), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Verified userscript ${version}`);
