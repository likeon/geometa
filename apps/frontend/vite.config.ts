import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import Icons from 'unplugin-icons/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'geometa',
        project: 'geometa-web'
      }
    }),
    enhancedImages(),
    Icons({
      compiler: 'svelte',
      autoInstall: true
    }),
    sveltekit()
  ],
  server: {
    port: parseInt(process.env.PORT || process.env.FRONTEND_PORT || '5173'),
    host: true
  }
});
