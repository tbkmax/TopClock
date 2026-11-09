import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { addonFragmentsPlugin } from './src/addons/build-fragments.js';

export default defineConfig({
    plugins: [addonFragmentsPlugin()],
    server: { watch: { ignored: ['**/src-tauri/target/**'] } },
    build: {
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                settings: resolve(import.meta.dirname, 'settings.html'),
                menu: resolve(import.meta.dirname, 'menu.html'),
            },
        },
    },
});
