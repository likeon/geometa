import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function injectChangelog() {
  let outDir = 'dist';
  return {
    name: 'inject-changelog',
    // closeBundle also fires when the dev server shuts down, which would
    // append a second changelog to the existing dist file
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const changelogPath = resolve(__dirname, 'CHANGELOG.md');
      const distPath = resolve(__dirname, outDir, 'geometa.user.js');

      const changelog = readFileSync(changelogPath, 'utf-8');
      const distContent = readFileSync(distPath, 'utf-8');

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

      writeFileSync(distPath, modifiedContent, 'utf-8');
      console.log(`Changelog injected into ${outDir}/geometa.user.js`);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  const apiUrl = env.VITE_GEOMETA_API_URL;
  const siteUrl = env.VITE_GEOMETA_SITE_URL;
  const isLocal = Boolean(apiUrl || siteUrl);
  const hosts = [apiUrl, siteUrl]
    .filter((url): url is string => Boolean(url))
    .map((url) => new URL(url).hostname);

  return {
    plugins: [
      svelte(),
      injectChangelog(),
      monkey({
        entry: 'src/main.ts',
        userscript: {
          icon: 'https://learnablemeta.com/favicon.png',
          version: '0.94',
          namespace: isLocal ? 'geometa-local' : 'geometa',
          name: isLocal ? 'GeoGuessr Learnable Meta (local dev)' : 'GeoGuessr Learnable Meta',
          description: 'UserScript for GeoGuessr Learnable Meta maps',
          match: ['*://*.geoguessr.com/*'],
          connect: [...new Set(['learnablemeta.com', ...hosts])],
          ...(isLocal
            ? {}
            : {
                updateURL:
                  'https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js',
                downloadURL:
                  'https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js'
              }),
          'run-at': 'document-start',
          require: [
            'https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js'
          ]
        }
      })
    ]
  };
});
