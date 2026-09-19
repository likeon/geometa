import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createManifest, scriptUrl, sha256 } from './release.mjs';

function readManifest(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new Error(`Cannot read manifest: ${path}`, { cause });
  }
}

// Adopt verified Actions artifact after successful Pages deployment.
assert.equal(
  process.argv.length,
  3,
  'Usage: node scripts/adopt-migration.mjs <artifact-directory>'
);
const artifactDirectory = resolve(process.argv[2]);
const content = readFileSync(resolve(artifactDirectory, 'geometa.user.js'));
const manifest = readManifest(resolve(artifactDirectory, 'manifest.json'));
const run = manifest.workflow?.match(
  /^https:\/\/github\.com\/likeon\/geometa\/actions\/runs\/([1-9]\d*)\/attempts\/([1-9]\d*)$/
);
assert.ok(run, 'Missing Actions run provenance');
assert.equal(manifest.version, '0.96', 'Only migration release 0.96 may replace legacy bundles');
assert.deepEqual(manifest, createManifest(content, '0.96', manifest.commit, run[1], run[2]));

const root = new URL('../', import.meta.url);
const paths = [new URL('dist/geometa.user.js', root), new URL('../dist/geometa.user.js', root)];

const response = await fetch(scriptUrl, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
assert.equal(response.status, 200, 'Pages userscript unavailable');
assert.equal(
  sha256(Buffer.from(await response.arrayBuffer())),
  manifest.sha256,
  'Pages must serve this exact Actions artifact before migration'
);

for (const path of paths) writeFileSync(path, content);
console.log(
  'Migration snapshots staged in working tree. Update install links and API version next.'
);
