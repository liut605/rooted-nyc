<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Rooted NYC

NYC Community Gardens Resilience Index — open-data scoring, crowdsourced threat alerts, and Gemini-powered advocacy.

View in AI Studio: https://ai.studio/apps/1d5b452b-fc24-4a12-93b0-a4bb385ac941

This app is set up to run **locally** and to **submit back to Google AI Studio**. Keep the server-side Gemini integration and `GEMINI_API_KEY` name — AI Studio injects that secret automatically.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/apikey)
3. Run the app:
   `npm run dev`
4. Open http://localhost:3000

Without a key, the rest of the app still runs. Gemini endpoints fall back to rule-based templates.

## Submit to AI Studio / the hackathon

Do **not** move Gemini calls into the browser. AI Studio requires server-side Gemini (`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` in `metadata.json`).

1. Push or re-import this repo into AI Studio Build
2. Confirm `GEMINI_API_KEY` is set in the Secrets panel (AI Studio injects it; do not rename the variable)
3. Deploy to Cloud Run from AI Studio — the server already listens on `process.env.PORT` and `0.0.0.0`
4. Keep `metadata.json`, the `/api/ai/*` routes, and `@google/genai` usage intact for judging
