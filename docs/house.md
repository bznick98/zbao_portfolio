# House walkthrough

Open `/#house` from the site's menu or a direct link. The page follows the existing hash navigation, typefaces, and light/dark palette. Enter the shared password to load the current home model. Use the room selector, drag to look, WASD/arrow keys to move, or the touch joystick on a phone. The viewer's settings include quality, minimap, reset, pointer lock, and fullscreen.

The page uses the verified remodeling workflow build `5e1768a93f1fe693`: 662 meshes, 407 collision footprints, and 11 room viewpoints. Its geometry, materials, light settings, and collision behavior come from that release. Website integration changes the surrounding UI and resource loading; it does not remodel the scene. Real-time lighting differs from Cycles, and the sky remains a placeholder.

## Password behavior

This is a static shared-password gate, not an account system or server-authenticated session. Scene metadata and the GLB are AES-256-GCM encrypted before entering this public repository, with a random salt, separate nonces, and PBKDF2-SHA-256 at 600,000 iterations. The password is supplied privately during import; neither the password nor a reusable decryption key is written to the release or application code. Three.js and viewer code remain public.

The browser checks the password against the small encrypted scene file before downloading the encrypted model (27.6 MB). It decrypts data in memory and gives the iframe temporary blob URLs. Leaving House, refreshing, or pressing **Lock** removes access; nothing is stored in localStorage, sessionStorage, cookies, or IndexedDB. Downloads can be cached as encrypted bytes. Use HTTPS (localhost is also a secure context).

The requested four-digit code is a convenience barrier. Anyone who downloads the encrypted files can attempt offline guesses; there is no server-side rate limit. A visitor who knows the password can save the decrypted content. Do not use this design for high-confidentiality material; stronger protection requires a longer password or server authentication plus private asset storage. Do not commit unencrypted model screenshots or source files alongside the encrypted release.

## Update the model

1. Save `model/house.blend` in the remodeling project.
2. Follow its `WORKFLOW.txt` review steps and run `npm run wf:release`. Keep the versioned output; do not edit its frozen files.
3. Run this repository's `npm run house:import -- <absolute-build-directory>`, supplying the password through stdin from a local secure prompt or secret manager. Do not put it in an argument, tracked file, or shell history. The importer verifies the release manifest, camera/layout checks, GLB validation, and browser report before writing anything deployable.
4. Review the generated changes under `public/house-viewer/` and run `npm run check`. The checked-in vendor tree deliberately retains the workflow's Three.js 0.180.0, isolated inside the iframe from the portfolio's existing Three.js version. Third-party licenses are preserved.
5. For browser review, run `node scripts/check-house-browser.mjs <local-origin>`, supplying the same password on stdin. It uses an installed Playwright and Chromium (Edge on Windows), saving local screenshots and a report under ignored `artifacts/house/`.
6. Prepare a local PR draft and obtain explicit approval before any GitHub write. Inspect the resulting Vercel preview before merging.

The importer copies only runtime viewer files and encrypts the model and layout. It excludes the `.blend`, source plans, reference photos, videos, raw GLB, and plaintext scene JSON. Changes to viewer/theme templates require running the importer again. Password changes also require reimporting; previously downloaded releases remain decryptable with their old password.

## Build and deploy

Use Node.js 22.12+ and `npm ci`, then `npm run check`. `vercel.json` selects the existing Vite build and `dist` output. The encrypted assets are checked in, so Vercel needs neither Blender nor a new environment variable for House. Existing Coffee/caption configuration remains separate.

The route is `https://zbao.art/#house` after this PR is merged and the existing deployment completes. Hash routes are resolved in the browser; no new rewrite rule is required. Both local development and production use the same encrypted asset paths. The iframe has no standalone unlock mechanism; a direct visit links back to House. The public login shell is available to crawlers; viewer assets send `X-Robots-Tag: noindex, nofollow` (this is not access control).

`npm run check` runs TypeScript, Node regression tests, and the Vite production build. Tests cover password rejection, authenticated decryption, corrupted/incomplete downloads, cancellation, resource URL cleanup, and absence of raw model files in the public tree. Browser checks cover both themes, desktop/mobile, room viewpoints, settings, touch, reload/lock behavior, and direct viewer access. Browser tests need WebGL; a production build alone does not verify rendering.
