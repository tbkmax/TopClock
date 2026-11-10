# TopClock website

This folder contains the GitHub Pages source. The site uses Alpine.js from the repository's installed dependencies and Vite only for bundling. It does not call Tauri APIs. The public base path is `/TopClock/`.

Run `npm run build:pages` to write `pages-dist/`, or `npm run preview:pages` after building to preview it. The `Publish website` workflow deploys `pages-dist/` after a push to `main` that changes this site. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** in the GitHub repository before the first deploy.

The Versions page summarizes the latest changes and the repository's version tags. Update its latest note when publishing a new release and link a new tag when one exists. The Microsoft Store listing is managed separately in Partner Center; the proposed description addition is in `store-description.md`.

The Add-ons tutorial includes an illustrated Settings map, not a screenshot. Its labels and instructions follow `settings.html`, `src/addons/views/settings-row.html`, and the built-in editor views; update the tutorial if those controls change. Its combined add-on guide follows `src/addons/layout.js`, and its Region search instructions follow `src/addons/builtins/region-picker.js`.
