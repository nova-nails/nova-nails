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
  integrations: [sitemap({ filter: (page) => !page.includes('/styleguide') && !page.includes('/bearbeiten') && !page.includes('/pe-version') })],
  // Dev-Port 4324 (4321–4323 belegt durch andere Projekte)
  server: { port: 4324 },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
