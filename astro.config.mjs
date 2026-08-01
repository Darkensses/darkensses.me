// @ts-check
import { defineConfig } from 'astro/config';
import glsl from 'vite-plugin-glsl';

import tunnel from 'astro-tunnel';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [glsl()],
    assetsInclude: ['**/*.glb']
  },

  integrations: [tunnel()]
});