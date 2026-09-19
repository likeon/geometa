import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function injectChangelog(): Plugin {
  let buildPath: string;
  return {
    name: 'inject-changelog',
    // Skip dev shutdown; preserve existing build.
    apply: 'build',
    configResolved(config) {
      buildPath = resolve(config.root, config.build.outDir, 'geometa.user.js');
    },
    closeBundle() {
      const changelogPath = resolve(__dirname, 'CHANGELOG.md');

      const changelog = readFileSync(changelogPath, 'utf-8');
      const distContent = readFileSync(buildPath, 'utf-8');

      const lines = distContent.split('\n');
      const userScriptEndIndex = lines.findIndex((line) => line.trim() === '// ==/UserScript==');

      const changelogComment = `\n\n\n/*\n${changelog}\n*/`;

      let modifiedContent =
        lines.slice(0, userScriptEndIndex + 1).join('\n') +
        changelogComment +
        '\n' +
        lines.slice(userScriptEndIndex + 1).join('\n');
      if (!modifiedContent.endsWith('\n')) {
        modifiedContent += '\n';
      }

      writeFileSync(buildPath, modifiedContent, 'utf-8');
      console.log(`✓ Changelog injected into ${buildPath}`);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  build: { outDir: 'build' },
  plugins: [
    svelte(),
    injectChangelog(),
    monkey({
      entry: 'src/main.ts',
      build: { fileName: 'geometa.user.js' },
      userscript: {
        icon: 'https://learnablemeta.com/favicon.png',
        version: '0.96',
        namespace: 'geometa',
        name: 'GeoGuessr Learnable Meta',
        description: 'UserScript for GeoGuessr Learnable Meta maps',
        match: ['*://*.geoguessr.com/*'],
        connect: ['learnablemeta.com'],
        updateURL: 'https://userscript.learnablemeta.com/geometa.user.js',
        downloadURL: 'https://userscript.learnablemeta.com/geometa.user.js',
        'run-at': 'document-start',
        require: [
          'https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js'
        ]
      }
    })
  ]
});
