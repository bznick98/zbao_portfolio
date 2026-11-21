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

The **House** menu opens a fullscreen, password-gated Three.js walkthrough at `/#house`. The login is a single password field. The minimap is on by default; a direct map icon toggles it, and a round menu contains view zoom and other settings. Dimensions and a two-point ruler sit beside the EN/CN switch in the top-left toolbar. Mouse-wheel zoom changes the view without walking. Controls follow the site's selected light or dark theme. Its verified layout2house delivery carries encrypted design revisions; each model loads only when selected after entering the shared password. See [House setup, model updates, and access limitations](docs/house.md).

Use Node.js 22.12+ and `npm ci`. Run `npm run check` for TypeScript, regression tests, and a production build. The existing Vercel deployment serves the page and encrypted model without new runtime configuration.

House Settings also opens **Design previews / 设计效果图**: the latest four
interior proposals and three original-model views, encrypted under the same
password and loaded on demand. They are design studies, not a new 3D revision.
See [gallery import and review](docs/house.md#design-previews).

House also includes **Walkthrough / Model** modes with a top-left EN/CN language switch (English by default): inspect the empty architectural shell, then return to the exact saved walking position and heading. The revision dropdown sits beside these modes. Dimensions use deterministic face measurements and accelerated occlusion. See [interaction behavior and model import checks](docs/house.md#controls).

### House revision reports

A model revision can have a private paginated design report. From this checkout
run `node scripts/import-house-report.mjs /path/to/report-manifest.json` with
the existing House password on standard input. The importer verifies the frozen
revision digest, the PDF and the page JPEGs before adding encrypted assets.
The manifest lists projectId, revisionId, revisionDigest, title, pdf
({path, sha256}) and pages (each with title, path, sha256), with schema 1.
The viewer loads only the open page and fetches the PDF when someone downloads it.
