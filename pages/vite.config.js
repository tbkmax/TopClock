import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    root: resolve(import.meta.dirname),
    base: '/TopClock/',
    build: {
        outDir: resolve(import.meta.dirname, '../pages-dist'),
        emptyOutDir: true,
    },
});
