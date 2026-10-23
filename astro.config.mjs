// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // [TODO: Domain festlegen – Wunsch novanails.ch, Alternative nova-nails.ch]
  site: 'https://www.novanails.ch',
  // Einheitliche URLs ohne Schrägstrich (Canonical und Sitemap identisch)
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap({ filter: (page) => !page.includes('/styleguide') })],
  vite: { plugins: [tailwindcss()] },
});
