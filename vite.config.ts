import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://www.google.com/s2/favicons?domain=geoguessr.com',
        version: '0.3',
        namespace: 'geometa',
        name: 'GeoGuessr Learnable Meta',
        description: 'UserScript for GeoGuessr Learnable Meta map',
        match: ['*://*.geoguessr.com/*'],
        connect: ['geometa-info-service.i-a38.workers.dev'],
        updateURL: 'https://github.com/likeon/geometa/raw/main/dist/geometa.user.js',
        downloadURL: 'https://github.com/likeon/geometa/raw/main/dist/geometa.user.js',
        "run-at": "document-start",
        require: ['https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/3d3dcb7084098be16fa510b17294a5a3140dfa70/geoguessr-event-framework.min.js'],
      },
    }),
  ],
});
