<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YEWbqrkbaiFiNbzVNlRiA5WN1GaYRDo-

## Run Locally

**Prerequisites:** Node.js 22.18+ (Node.js 24 recommended)


1. Install dependencies:
   `npm ci`
2. Configure `VITE_UNSPLASH_ACCESS_KEY` in your local environment or `.env.local` to load portfolio photos. Optional fallback keys use the suffixes `_1` through `_5`.
3. Run the app:
   `npm run dev`

Tailwind styles are compiled locally by Vite. Validate changes with `npm test`, `npm run build`, and `npx tsc --noEmit`, then use `npm run preview` to check the production build.

Photos receive description-based captions immediately. The homepage also chooses short, attributed wisdom quotes on each visit. Optional AI refinement supplies poetic titles and original reflections inspired by the photos. Set `OPENAI_API_KEY` in the server environment (`.env.local` locally, project settings on Vercel); never prefix this secret with `VITE_`. `OPENAI_MODEL` optionally overrides `gpt-4o-mini`. Missing credentials or provider failures keep the existing captions and quotes visible.

Vite development and preview servers run the same `/api/generate-captions` handler as the Vercel serverless function. No AI credential is required to run or test the site.

Poe uses Rapier rigid-body physics with matching rendered and collision shapes, a bounded tray, and a fixed simulation timestep. Hold/release the cast button (mouse, touch, Enter, or Space), or swipe the tray. Results are read from both blocks' settled orientations: mixed faces means Yes, two round means No, and two flat means Ask again. Ambiguous or unsettled landings request another cast. Tests cover these readings and repeated casts at different frame rates.
