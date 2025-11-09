import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function injectChangelog() {
  return {
    name: 'inject-changelog',
    closeBundle() {
      const changelogPath = resolve(__dirname, 'CHANGELOG.md');
      const distPath = resolve(__dirname, 'dist/geometa.user.js');

      const changelog = readFileSync(changelogPath, 'utf-8');
      const distContent = readFileSync(distPath, 'utf-8');

      const lines = distContent.split('\n');
      const userScriptEndIndex = lines.findIndex((line) => line.trim() === '// ==/UserScript==');

      const changelogComment = `\n\n\n/*\n${changelog}\n*/`;

      const modifiedContent =
        lines.slice(0, userScriptEndIndex + 1).join('\n') +
        changelogComment +
        '\n' +
        lines.slice(userScriptEndIndex + 1).join('\n');

      writeFileSync(distPath, modifiedContent, 'utf-8');
      console.log('✓ Changelog injected into dist/geometa.user.js');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    injectChangelog(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://learnablemeta.com/favicon.png',
        version: '0.88',
        namespace: 'geometa',
        name: 'GeoGuessr Learnable Meta',
        description: 'UserScript for GeoGuessr Learnable Meta maps',
        match: ['*://*.geoguessr.com/*'],
        connect: ['learnablemeta.com'],
        updateURL: 'https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js',
        downloadURL: 'https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js',
        'run-at': 'document-start',
        require: [
          'https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js'
        ]
      }
    })
  ]
});
