# House walkthrough

Open `/#house` from the site's menu or a direct link. Enter the shared password in the minimal login form to open a Three.js canvas filling the entire viewport. House hides the portfolio navigation, theme buttons, Eye, titles, and footer. The selected portfolio theme carries into the login and viewer controls. Drag to look, use WASD/arrow keys to move, or use the phone joystick. The minimap starts visible. A single top-right button contains room selection, quality, minimap visibility, a view-zoom slider and reset, dimension overlay, pointer lock, browser fullscreen, page lock, and a return link. Mouse-wheel zoom over the scene changes lens magnification (0.65×–3×) without moving the camera; the value survives resizing and room changes. Menu scrolling and Ctrl+wheel retain their normal behavior.

The page uses the verified remodeling workflow build `b4bd0080b03ce8cc`: 662 meshes, 407 collision footprints, and 11 room viewpoints. This is the current V9 white-model/teak scene with the V10 route. Its geometry, materials, light settings, and collision behavior come from that release. Website integration changes the surrounding UI and resource loading; it does not remodel the scene. Real-time lighting differs from Cycles, and the sky remains a placeholder.

## Dimensions

Enable **尺寸 overlay** in the folded menu. Labels and witness lines are projected into the 3D view and update as you move or change the view. Horizontal measurements are the world-axis wall-to-wall spans of a section 1.2 m above the model floor, up to 1.5 m in front of the current camera. Height is the floor-to-ceiling clearance at that location. These are section spans, not a room bounding box or a whole-room survey; open doorways can extend a span into the adjoining space.

Distances come from triangle intersections with the loaded GLB (walls, structure, windows, and doors; floors and ceilings for height). Furniture is excluded from architectural spans. A missing opposing boundary produces no dimension. Labels are in metres, rounded to two decimals and marked approximate. The original assumed heights and plan-derived dimensions remain model assumptions, not site measurements. Dimensions start off, so the initial scene stays uncluttered.

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

The importer copies only runtime viewer files and encrypts the model and layout. It excludes the `.blend`, source plans, reference photos, videos, raw GLB, and plaintext scene JSON. UI-only changes to `house-viewer/index.html`, `bridge.js`, `theme.css`, `controls.js`, and `measurements.js` should also be copied into `public/house-viewer/`; this preserves the existing encrypted model bytes. The importer uses those templates for future model releases. Password changes also require reimporting; previously downloaded releases remain decryptable with their old password.

## Build and deploy

Use Node.js 22.12+ and `npm ci`, then `npm run check`. `vercel.json` selects the existing Vite build and `dist` output. The encrypted assets are checked in, so Vercel needs neither Blender nor a new environment variable for House. Existing Coffee/caption configuration remains separate.

The route is `https://zbao.art/#house` after this PR is merged and the existing deployment completes. Hash routes are resolved in the browser; no new rewrite rule is required. Both local development and production use the same encrypted asset paths. The iframe has no standalone unlock mechanism; a direct visit links back to House. The public login shell is available to crawlers; viewer assets send `X-Robots-Tag: noindex, nofollow` (this is not access control).

`npm run check` runs TypeScript, Node regression tests, and the Vite production build. Tests cover password rejection, authenticated decryption, corrupted/incomplete downloads, cancellation, resource URL cleanup, ray-intersection dimensions (including missing/rotated boundaries), clipping, zoom limits, and absence of raw model files in the public tree. Browser checks cover full-viewport canvas sizing, default minimap, wheel/slider zoom, projected dimension labels, inherited themes, desktop/mobile including landscape, room viewpoints, settings, touch, reload/lock behavior, and direct viewer access. Browser tests need WebGL; a production build alone does not verify rendering.
