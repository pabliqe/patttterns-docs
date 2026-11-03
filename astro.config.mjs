import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.patttterns.com',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'PATTTTERNS Docs',
      description:
        'Internal documentation and roadmaps for the PATTTTERNS design pattern library.',
      logo: {
        src: './src/assets/logo.png',
        alt: 'PATTTTERNS',
      },
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'robots',
            content: 'noindex, nofollow, noarchive, nosnippet',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'googlebot',
            content: 'noindex, nofollow, noarchive, nosnippet',
          },
        },
      ],
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'Home', link: '/' },
            { label: 'Ad Banners', link: '/ad-banners/' },
          ],
        },
        {
          label: 'Styling',
          items: [{ autogenerate: { directory: 'styling' } }],
        },
        {
          label: 'Data & Analytics',
          items: [{ autogenerate: { directory: 'data-and-analytics' } }],
        },
        {
          label: 'Search and MCP',
          items: [{ autogenerate: { directory: 'search-and-mcp' } }],
        },
        {
          label: 'Building and Deploy',
          items: [{ autogenerate: { directory: 'build-and-deploy' } }],
        },
        {
          label: 'Product Roadmaps',
          items: [{ autogenerate: { directory: 'product-roadmaps' } }],
        },
        {
          label: 'Roadmaps',
          items: [{ autogenerate: { directory: 'roadmaps' } }],
        },
      ],
    }),
  ],
});
