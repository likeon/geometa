import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const scriptUrl = 'https://userscript.learnablemeta.com/geometa.user.js';

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function validateScript(content, version) {
  const text = content.toString();
  const header = text.match(/^\/\/ ==UserScript==\r?\n([\s\S]*?)^\/\/ ==\/UserScript==$/m)?.[1];
  assert.ok(header && text.startsWith('// ==UserScript=='), 'Missing userscript header');
  assert.match(version, /^\d+(?:\.\d+)*$/, 'Invalid userscript version');
  const expected = {
    name: 'GeoGuessr Learnable Meta',
    namespace: 'geometa',
    version,
    updateURL: scriptUrl,
    downloadURL: scriptUrl,
    connect: 'learnablemeta.com'
  };
  for (const [key, value] of Object.entries(expected)) {
    const entries = [...header.matchAll(new RegExp(`^// @${key}\\s+(.+)$`, 'gm'))];
    assert.deepEqual(
      entries.map((entry) => entry[1].trim()),
      [value],
      `Invalid @${key}`
    );
  }
  assert.ok(text.includes(`## [${version}]`), 'Missing release changelog');
  assert.ok(text.slice(text.indexOf('// ==/UserScript==')).includes('(function'), 'Missing bundle');
}

export function createManifest(
  content,
  version,
  commit,
  runId,
  runAttempt,
  repository = 'likeon/geometa'
) {
  validateScript(content, version);
  assert.match(commit, /^[a-f0-9]{40}$/, 'Invalid source commit');
  assert.match(runId, /^[1-9]\d*$/, 'Invalid workflow run ID');
  assert.match(runAttempt, /^[1-9]\d*$/, 'Invalid workflow run attempt');
  assert.match(repository, /^[\w.-]+\/[\w.-]+$/, 'Invalid repository');
  const repositoryUrl = `https://github.com/${repository}`;
  return {
    version,
    url: scriptUrl,
    commit,
    source: `${repositoryUrl}/tree/${commit}`,
    workflow: `${repositoryUrl}/actions/runs/${runId}/attempts/${runAttempt}`,
    sha256: sha256(content)
  };
}
