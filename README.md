<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YEWbqrkbaiFiNbzVNlRiA5WN1GaYRDo-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## House

The **House** menu opens a password-gated 3D walkthrough at `/#house`, matching the site's light and dark themes. Its verified remodeling workflow release is encrypted before publication and loaded only after entering the shared password. See [House setup, model updates, and access limitations](docs/house.md).

Use Node.js 22.12+ and `npm ci`. Run `npm run check` for TypeScript, regression tests, and a production build. The existing Vercel deployment serves the page and encrypted model without new runtime configuration.
