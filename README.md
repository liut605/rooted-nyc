# Rooted NYC

NYC Community Gardens Resilience Index: NYC Open Data, rule-based resilience scoring, garden maps, and crowdsourced threat reports. The app does not require Gemini or Google AI Studio.

## Run locally

Prerequisites: Node.js 24 and npm. Use the root `package.json` and `package-lock.json` for the main application.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_CARTO_API_KEY` to your [CARTO Basemaps key](https://www.carto.com/basemaps/apikey/).
4. Run `npm run dev` and open http://localhost:3000.

The CARTO key is for browser use and is visible in map requests. Restrict it to your website domains in the CARTO dashboard; do not use a private administrative credential. Keep CARTO and OpenStreetMap attribution visible. Without the key, the app still starts, but CARTO may watermark or restrict the basemap. Restart the development server after changing `.env.local`.

## Deploy to Vercel

Use the repository root as the Vercel project root. In Settings > Environment Variables, add `VITE_CARTO_API_KEY` for the environments you use (Production and, if needed, Preview and Development), then redeploy. Vite embeds this value at build time, so changing it requires a new deployment.

`vercel.json` builds the frontend and regenerates the API bundle. Backend edits belong in `src/api/`, not the generated `api/index.js`.

## Project structure

- `src/App.tsx`: application navigation and screen selection.
- `nyc-rooted-landing/src/App.tsx`: landing page imported by the main app; this folder is required.
- `src/components/GardenDataExplorer.tsx`: garden explorer interface.
- `src/components/GardenNetworkTab.tsx`: Leaflet map, CARTO tiles, pins, and zoom.
- `src/services/`: NYC Open Data loading, rule-based scoring, report storage, and visual handling.
- `src/data/`: seed gardens, curated overrides, and generated visual metadata.
- `public/`: images and other static assets.
- `src/api/app.ts`: Express API routes.
- `src/api/vercel-handler.ts`: Vercel API entry point.
- `api/index.js`: generated Vercel API bundle.
- `server.ts`: local development and standalone production server.
- `scripts/fetchGardenVisuals.ts`: refreshes garden visual metadata.

## Commands

- `npm run lint`: TypeScript checks.
- `npm run build`: frontend and standalone server build.
- `npm run build:api`: regenerate the Vercel API bundle.
- `npm start`: run the standalone production build.
- `npm run fetch:visuals`: refresh garden visual metadata.

Dependencies, frontend build output, local environment files, and `.vercel/` are excluded from Git.
