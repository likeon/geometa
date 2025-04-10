import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'geometa',
        project: 'geometa-web'
      },
      adapter: 'cloudflare'
    }),
    enhancedImages(),
    Icons({
      compiler: 'svelte'
    }),
    sveltekit()
  ]
});
