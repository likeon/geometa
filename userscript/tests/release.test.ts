import { describe, expect, test } from 'vitest';
import { createManifest, scriptUrl, sha256, validateScript } from '../scripts/release.mjs';

import { scriptFixture as fixture, sourceCommit as commit } from './fixtures/release';

describe('release artifact', () => {
  test('accepts stable identity, version, changelog, and Pages URLs', () => {
    expect(() => validateScript(fixture, '0.96')).not.toThrow();
  });

  test.each(['name', 'namespace', 'version', 'updateURL', 'downloadURL', 'connect'])(
    'rejects incorrect @%s',
    (key) => {
      const changed = fixture.replace(new RegExp(`// @${key}\\s+[^\\n]+`), `// @${key} wrong`);
      expect(() => validateScript(changed, '0.96')).toThrow(`Invalid @${key}`);
    }
  );

  test('rejects duplicate metadata', () => {
    const changed = fixture.replace('// @version', '// @version 0.95\n// @version');
    expect(() => validateScript(changed, '0.96')).toThrow('Invalid @version');
  });

  test('rejects mismatched changelog and missing bundle', () => {
    expect(() => validateScript(fixture.replace('## [0.96]', '## [0.95]'), '0.96')).toThrow(
      'Missing release changelog'
    );
    expect(() => validateScript(fixture.replace('(function () {})();', ''), '0.96')).toThrow(
      'Missing bundle'
    );
  });

  test('records exact bytes, source commit, and workflow attempt', () => {
    expect(createManifest(fixture, '0.96', commit, '123', '2')).toEqual({
      version: '0.96',
      url: scriptUrl,
      commit,
      source: `https://github.com/likeon/geometa/tree/${commit}`,
      workflow: 'https://github.com/likeon/geometa/actions/runs/123/attempts/2',
      sha256: sha256(fixture)
    });
    expect(sha256(`${fixture}\n`)).not.toBe(sha256(fixture));
  });

  test('records source and run links for the repository that built the artifact', () => {
    const manifest = createManifest(fixture, '0.96', commit, '123', '1', 'someone/geometa');
    expect(manifest.source).toBe(`https://github.com/someone/geometa/tree/${commit}`);
    expect(manifest.workflow).toBe(
      'https://github.com/someone/geometa/actions/runs/123/attempts/1'
    );
  });

  test('rejects missing or malformed provenance', () => {
    expect(() => createManifest(fixture, '0.96', 'main', '123', '1')).toThrow(
      'Invalid source commit'
    );
    expect(() => createManifest(fixture, '0.96', commit, '', '1')).toThrow(
      'Invalid workflow run ID'
    );
    expect(() => createManifest(fixture, '0.96', commit, '123', '0')).toThrow(
      'Invalid workflow run attempt'
    );
  });
});
