import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
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
