import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

export default defineConfig({
  site: 'https://docs.learnablemeta.com',
  integrations: [
    starlight({
      title: 'Learnable Meta',
      description:
        'Learn how to install Learnable Meta, play educational GeoGuessr maps, and add Learnable Meta to your own maps.',
      plugins: [
        starlightOpenAPI([
          {
            base: 'api',
            schema:
              process.env.DOCS_OPENAPI_SCHEMA_URL ??
              'https://learnablemeta.com/api/docs/json',
            sidebar: {
              label: 'API Documentation',
              operations: { badges: true, labels: 'summary' }
            }
          }
        ])
      ],
      logo: {
        src: './src/assets/logo.png',
        alt: 'Learnable Meta logo'
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
            {
              label: 'Installation',
              items: [
                { label: 'Chrome and Chromium', link: '/getting-started/chrome/' },
                { label: 'Firefox', link: '/getting-started/firefox/' },
                { label: 'Android', link: '/getting-started/android/' },
                { label: 'iOS and iPadOS', link: '/getting-started/ios/' }
              ]
            }
          ]
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
        ...openAPISidebarGroups,
        {
          label: 'Help',
          items: [
            { label: 'Troubleshooting', link: '/troubleshooting/' },
            { label: 'Reference', link: '/reference/' }
          ]
        },
        {
          label: 'Learnable Meta',
          collapsed: true,
          items: [
            { label: 'Open Learnable Meta', link: 'https://learnablemeta.com' },
            { label: 'Browse maps', link: 'https://learnablemeta.com/maps' },
            { label: 'Creator dashboard', link: 'https://learnablemeta.com/map-making' }
          ]
        }
      ]
    })
  ]
});
