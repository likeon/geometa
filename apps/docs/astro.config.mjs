import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.learnablemeta.com',
  integrations: [
    starlight({
      title: 'LearnableMeta',
      description:
        'Learn how to install LearnableMeta, play educational GeoGuessr maps, and add LearnableMeta to your own maps.',
      logo: {
        src: './src/assets/logo.png',
        alt: 'LearnableMeta logo'
      },
      favicon: '/favicon.png',
      editLink: {
        baseUrl: 'https://github.com/likeon/geometa/edit/main/apps/docs/'
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/likeon/geometa' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/AcXEWznYZe' }
      ],
      customCss: ['./src/styles/custom.css'],
      expressiveCode: {
        styleOverrides: { borderRadius: '0.5rem' }
      },
      sidebar: [
        { label: 'Documentation home', link: '/' },
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/getting-started/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Chrome and Chromium', link: '/getting-started/chrome/' },
            { label: 'Firefox', link: '/getting-started/firefox/' },
            { label: 'Android', link: '/getting-started/android/' },
            { label: 'iOS and iPadOS', link: '/getting-started/ios/' }
          ]
        },
        {
          label: 'Using LearnableMeta',
          items: [{ label: 'How to use LearnableMeta', link: '/using-learnable-meta/' }]
        },
        {
          label: 'Map Creators',
          items: [
            { label: 'Getting started', link: '/map-creators/getting-started/' },
            { label: 'Map JSON and tags', link: '/map-creators/map-format/' },
            { label: 'GeoJSON map areas', link: '/map-creators/geojson-overlays/' },
            { label: 'Meta uploads', link: '/map-creators/meta-uploads/' }
          ]
        },
        {
          label: 'Help',
          items: [
            { label: 'Troubleshooting', link: '/troubleshooting/' },
            { label: 'Reference', link: '/reference/' }
          ]
        },
        {
          label: 'LearnableMeta',
          collapsed: true,
          items: [
            { label: 'Open LearnableMeta', link: 'https://learnablemeta.com' },
            { label: 'Browse maps', link: 'https://learnablemeta.com/maps' },
            { label: 'Creator dashboard', link: 'https://learnablemeta.com/map-making' },
            { label: 'API documentation', link: 'https://learnablemeta.com/api/docs' }
          ]
        }
      ]
    })
  ]
});
