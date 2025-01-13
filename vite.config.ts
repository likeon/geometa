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
        version: '0.77',
        namespace: 'geometa',
        name: 'GeoGuessr Learnable Meta',
        description: 'UserScript for GeoGuessr Learnable Meta maps',
        match: ['*://*.geoguessr.com/*'],
        connect: ['learnablemeta.com'],
        updateURL: 'https://github.com/likeon/geometa/raw/main/dist/geometa.user.js',
        downloadURL: 'https://github.com/likeon/geometa/raw/main/dist/geometa.user.js',
        'run-at': 'document-start',
        require: [
          'https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/b0c7492f4f346d4acb594a2015d592616a665096/geoguessr-event-framework.js'
        ]
      }
    })
  ]
});
