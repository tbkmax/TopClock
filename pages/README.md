# TopClock website

This folder contains the GitHub Pages source. The site uses Alpine.js from the repository's installed dependencies and Vite only for bundling. It does not call Tauri APIs. The public base path is `/TopClock/`.

Run `npm run build:pages` to write `pages-dist/`, or `npm run preview:pages` after building to preview it. The `Publish website` workflow deploys `pages-dist/` after a push to `main` that changes this site. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** in the GitHub repository before the first deploy.

The Versions page is editorial content based on the repository's version tags. Update it when publishing a new release. The Microsoft Store listing is managed separately in Partner Center; the proposed description addition is in `store-description.md`.
