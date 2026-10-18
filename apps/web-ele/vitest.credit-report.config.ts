import { fileURLToPath } from 'node:url';

import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [Vue()],
  resolve: { alias: { '#': fileURLToPath(new URL('src', import.meta.url)) } },
  test: {
    environment: 'happy-dom',
    include: ['src/views/yumie/reports/__tests__/yumie-credit*.test.ts'],
  },
});
