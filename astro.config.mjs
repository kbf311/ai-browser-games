// @ts-check
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import { minify } from 'vite';

import tailwindcss from '@tailwindcss/vite';

/**
 * Minifies `.js?raw` imports during production builds.
 * Top-level names are preserved because game scripts are injected via `<script is:inline>`
 * and share globals across separate script tags.
 * @returns {import('vite').Plugin}
 */
function minifyRawJs() {
  return {
    name: 'minify-raw-js',
    enforce: 'pre',
    apply: 'build',
    async load(id) {
      if (!/\.js\?raw(?:&|$)/.test(id)) return null;
      const filePath = id.split('?')[0];
      const source = await readFile(filePath, 'utf8');
      const result = await minify(filePath, source, {
        mangle: { toplevel: false },
      });
      if (result.errors.length > 0) {
        throw new Error(
          `Failed to minify ${filePath}: ${result.errors.map((e) => e.message).join(', ')}`
        );
      }
      return `export default ${JSON.stringify(result.code)};`;
    },
  };
}

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), minifyRawJs()]
  }
});