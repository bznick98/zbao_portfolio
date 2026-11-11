# House walkthrough

Open `/#house` from the site's menu or a direct link. Enter the shared password in the minimal login form to open a Three.js canvas filling the entire viewport. House hides the portfolio navigation, theme buttons, Eye, titles, and footer; a compact top switch selects the interaction mode. The selected portfolio theme carries into the login and viewer controls. Drag to look, use WASD/arrow keys to move, or use the phone joystick. The minimap starts visible. A single top-right button contains room selection, quality, minimap visibility, a view-zoom slider and reset, dimension overlay, pointer lock, browser fullscreen, page lock, and a return link. Mouse-wheel zoom over the scene changes lens magnification (0.65×–3×) without moving the camera; the value survives resizing and room changes. Menu scrolling and Ctrl+wheel retain their normal behavior.

The page uses the verified remodeling workflow build `39fc95b3b0e90355`: 662 meshes, 407 collision footprints, and 11 room viewpoints. This uses the current source scene and V11 viewpoint metadata; this web change does not render a new Cycles video. Its geometry and collision behavior come from that release. Website integration adds UI, private resource loading, fixed wall annotations, and the web finish profile described below; it does not remodel the scene. Real-time lighting differs from Cycles, and the sky remains a placeholder.

## Interactive Artifacts modes

House opens in **室内漫游**. The top mode buttons and **查看建筑模型 / 返回漫游** shortcut use the same state transition. Switching saves the exact walking position, yaw, pitch, room, selected viewpoint and lens zoom, clears movement/inertia and exits pointer lock. The model camera has its own orbit target and zoom; returning restores the saved walking pose exactly.

**建筑模型** derives a shell from the same loaded GLB and shares its geometries. It shows Walls, Structure, Floors, Doors and Windows, hiding ceilings, joinery, fixtures and furniture. Neutral presentation materials are confined to the shell copy. The walk scene's materials and per-object visibility are retained. The default slanted overview fits the whole layout, with drawing-up aligned to screen-up; it is a perspective view, not the PDF projection or a geographic north claim.

Drag to rotate, use the wheel to zoom, and right-drag to pan. On touch screens, use one finger to rotate and two fingers to pinch/pan. Orbit distance, inclination and panning are bounded to keep the camera above the slab and the model reachable. **恢复斜俯瞰** recenters the complete model; resizing refits it. The amber marker and arrow use the saved walking camera's real coordinates and heading, remain attached to the model, and stay visible through occluding geometry.

The walk joystick, room selector, pointer-lock button, minimap, lens slider and wall-dimension controls hide in model mode. Quality, fullscreen and page locking remain available. Returning restores walk settings, including any enabled wall dimensions. Mode changes reuse the loaded GLB and shell geometry; tests check repeated switches for stable GPU resources and one model download per unlock.

The source implementation and export integration live in the remodeling project (`viewer/walkthrough/artifact-modes.js`, `scripts/workflow/web_build.py`). Its build vendors the matching Three.js OrbitControls locally. The website importer copies verified mode files and requires desktop/mobile Interactive Artifacts checks before accepting a new release.

## Dimensions

Enable **尺寸 overlay** in the folded menu. The viewer builds fixed dimension lines and labels once, directly on solid wall faces. They share the wall's position and orientation, scale with perspective, and are hidden by walls or furniture in front. There is no screen-space SVG, camera-facing billboard, continuous measurement, or per-frame annotation update. Toggling reuses the same two meshes and label atlas.

**墙段** is the length of that solid wall face; **墙高** is its full modeled height, not floor-to-ceiling clearance. Dimensions come from actual world-space GLB triangles, in metres rounded to two decimals. Only rectangular vertical wall faces at least 1.1 m wide and 1.8 m high are labeled. Faces containing holes/disconnected patches, narrow piers, lintels, trim, windows, and furniture are excluded rather than inventing spans across gaps. Labels describe model dimensions; assumed heights remain unmeasured.

## Web finishes

The workflow release retains the V9 clay model. The website applies a separate, reversible finish profile after loading: warm ivory plaster, a lighter matte ceiling, oak-colored wood doors/joinery, honed stone, dark bronze window frames, pale cabinetry, ceramic and metal hardware. Deterministic small procedural textures add subtle grain and surface relief. The source textured teak floor and transparent glazing are retained. These finishes distinguish surfaces for the walkthrough and are not confirmed construction specifications.

A small generated neutral studio environment supplies soft material reflections, with a warmer ground fill and modest ambient fill. It is not a captured apartment reflection. The sky is still a placeholder, reflections are approximate, and this remains real-time rendering without baked indirect light. Source Blender geometry, the video render, encrypted model bytes, and collision footprints are unchanged.

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

The importer copies only runtime viewer files and encrypts the model and layout. It excludes the `.blend`, source plans, reference photos, videos, raw GLB, and plaintext scene JSON. UI-only changes to `house-viewer/index.html`, `bridge.js`, `theme.css`, `controls.js`, `measurements.js`, `wall-annotations.js`, and `finishes.js` should also be copied into `public/house-viewer/`; this preserves the existing encrypted model bytes. The importer uses those templates for future model releases. Password changes also require reimporting; previously downloaded releases remain decryptable with their old password.

## Build and deploy

Use Node.js 22.12+ and `npm ci`, then `npm run check`. `vercel.json` selects the existing Vite build and `dist` output. The encrypted assets are checked in, so Vercel needs neither Blender nor a new environment variable for House. Existing Coffee/caption configuration remains separate.

The route is `https://zbao.art/#house` after this PR is merged and the existing deployment completes. Hash routes are resolved in the browser; no new rewrite rule is required. Both local development and production use the same encrypted asset paths. The iframe has no standalone unlock mechanism; a direct visit links back to House. The public login shell is available to crawlers; viewer assets send `X-Robots-Tag: noindex, nofollow` (this is not access control).

`npm run check` runs TypeScript, Node regression tests, and the Vite production build. Tests cover password rejection, authenticated decryption, corrupted/incomplete downloads, cancellation, resource URL cleanup, wall-face dimensions (including gaps and rotated/scaled geometry), separated finishes, zoom limits, and absence of raw model files in the public tree. Browser checks cover full-viewport canvas sizing, exact pose round trips, empty-shell visibility, marker alignment, orbit/pan/zoom, touch pinch, pointer-lock exit, repeated switches, default minimap, wheel/slider zoom, fixed wall labels, finish differentiation, inherited themes, desktop/mobile including landscape, room viewpoints, settings, touch, reload/lock behavior, and direct viewer access. Browser tests need WebGL; a production build alone does not verify rendering.
