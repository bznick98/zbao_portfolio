<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YEWbqrkbaiFiNbzVNlRiA5WN1GaYRDo-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm ci`
2. Configure `VITE_UNSPLASH_ACCESS_KEY` in your local environment or `.env.local` to load portfolio photos. Optional fallback keys use the suffixes `_1` through `_5`.
3. Run the app:
   `npm run dev`

Tailwind styles are compiled locally by Vite; the app does not need the Tailwind browser CDN. Validate changes with `npm run build` and `npx tsc --noEmit`, then use `npm run preview` to check the production build.

Vercel runs `api/generate-captions.ts` as a serverless function. AI captions require `OPENAI_API_KEY` in the Vercel project's server-side environment. The plain Vite development and preview servers serve the frontend only; they do not run this API handler. Photos can still load without generated captions.
