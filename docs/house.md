# House walkthrough

Open `/#house` from the site's menu or a direct link. Enter the shared password in the minimal login form to open a Three.js canvas filling the entire viewport. House hides the portfolio navigation, theme buttons, Eye, titles, and footer; a compact top switch selects the interaction mode. The selected portfolio theme carries into the login and viewer controls. Drag to look, use WASD/arrow keys to move, or use the phone joystick. The minimap starts visible. A single top-right button contains room selection, quality, minimap visibility, a view-zoom slider and reset, dimension overlay, pointer lock, browser fullscreen, page lock, and a return link. Mouse-wheel zoom over the scene changes lens magnification (0.65×–3×) without moving the camera; the value survives resizing and room changes. Menu scrolling and Ctrl+wheel retain their normal behavior.

The page uses the verified remodeling workflow build `992b93e4eb850141`: 662 meshes, 407 collision footprints, and 11 room viewpoints. This uses the current source scene and V11 viewpoint metadata; this web change does not render a new Cycles video. Its geometry and collision behavior come from that release. Website integration adds UI, private resource loading, fixed wall annotations, and the web finish profile described below; it does not remodel the scene. Real-time lighting differs from Cycles, and the sky remains a placeholder.

## Interactive Artifacts modes

House opens in **Walkthrough** with English UI by default. A top-left **EN / CN** button switches every viewer label, room name, help and loading message between English and Chinese, and remembers the choice locally. Language changes preserve both cameras and current settings. The top **Walkthrough / Model** toggle is the only mode control; redundant shortcuts have been removed. Switching saves the exact walking position, yaw, pitch, room, selected viewpoint and lens zoom, clears movement/inertia and exits pointer lock. The model camera has its own orbit target and zoom; returning restores the saved walking pose exactly.

**Model / 建筑模型** derives a shell from the same loaded GLB and shares its geometries. It shows Walls, Structure, Floors, Doors and Windows, hiding ceilings, joinery, fixtures and furniture. Neutral presentation materials are confined to the shell copy. The walk scene's materials and per-object visibility are retained. The default slanted overview fits the whole layout, with drawing-up aligned to screen-up; it is a perspective view, not the PDF projection or a geographic north claim.

Drag to rotate, use the wheel to zoom, and right-drag to pan. On touch screens, use one finger to rotate and two fingers to pinch/pan. Orbit distance, inclination and panning are bounded to keep the camera above the slab and the model reachable. **Reset overview / 恢复斜俯瞰** recenters the complete model; resizing refits it. The amber marker and arrow use the saved walking camera's real coordinates and heading, remain attached to the model, and stay visible through occluding geometry.

The walk joystick, room selector, pointer-lock button, minimap and lens slider hide in model mode. The EN/CN, dimensions and ruler tools remain together at the top-left. Quality, fullscreen and page locking remain available. Returning restores walk settings, including any enabled dimensions. Mode changes reuse the loaded GLB and shell geometry; tests check repeated switches for stable GPU resources and one model download per unlock.

The source implementation and export integration live in the remodeling project (`viewer/walkthrough/artifact-modes.js`, `scripts/workflow/web_build.py`). Its build vendors the matching Three.js OrbitControls locally. The website importer copies verified mode files and requires desktop/mobile Interactive Artifacts checks before accepting a new release.

## Dimensions and ruler

Use the dimension icon beside **EN / CN** to toggle fixed architectural linework: thin dimension lines, extension lines, diagonal end ticks and labels in millimetres. In Walkthrough, annotations remain attached to actual solid wall faces. Width labels measure those wall segments; **H** measures modeled wall height. Vertical dimensions remain model assumptions, not site measurements.

In Model, the overlay uses all **79 annotations from the supplied PM-1-05 floor plan**, including the 19000 / 16800 mm overall axis dimensions. The build verifies the PDF hash and shared calibration, maps drawing endpoints and extension strokes into the GLB coordinate system, and keeps the printed millimetre values. Axis spans, room sizes and fitout dimensions retain their drawing meaning; they are not relabeled as wall-face widths. Labels and lines are fixed in world coordinates and zoom with the model. Zoom in for small drawing details. This is a drawing overlay, not a new claim that every model dimension or site measurement has been independently verified.

Use the adjacent **ruler** icon, then select two visible model surfaces to measure the straight 3D distance between the exact clicked points, including height changes and diagonals. It works in both modes and with touch. Dragging, right-dragging and two-finger gestures still navigate without placing endpoints. The line, endpoints and value remain anchored to the model. Select a third point to start a new measurement, use **Clear** to reset, or turn the ruler off / press Escape to exit. Clicking empty sky does not invent a distance. Language changes preserve the measurement.

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

The importer copies only runtime viewer files and encrypts the model and layout. It excludes the `.blend`, source plans, reference photos, videos, raw GLB, and plaintext scene JSON. UI-only changes to `house-viewer/index.html`, `bridge.js`, `theme.css`, `controls.js`, `measurements.js`, and `finishes.js` should also be copied into `public/house-viewer/`; this preserves the existing encrypted model bytes. The importer uses those templates for future model releases. Password changes also require reimporting; previously downloaded releases remain decryptable with their old password.

## Build and deploy

Use Node.js 22.12+ and `npm ci`, then `npm run check`. `vercel.json` selects the existing Vite build and `dist` output. The encrypted assets are checked in, so Vercel needs neither Blender nor a new environment variable for House. Existing Coffee/caption configuration remains separate.

The route is `https://zbao.art/#house` after this PR is merged and the existing deployment completes. Hash routes are resolved in the browser; no new rewrite rule is required. Both local development and production use the same encrypted asset paths. The iframe has no standalone unlock mechanism; a direct visit links back to House. The public login shell is available to crawlers; viewer assets send `X-Robots-Tag: noindex, nofollow` (this is not access control).

`npm run check` runs TypeScript, Node regression tests, and the Vite production build. Tests cover password rejection, authenticated decryption, corrupted/incomplete downloads, cancellation, resource URL cleanup, wall-face dimensions (including gaps and rotated/scaled geometry), separated finishes, zoom limits, and absence of raw model files in the public tree. Browser checks cover English default and persisted EN/CN switching, a non-overlapping header down to 320px, full-viewport canvas sizing, exact pose round trips, empty-shell visibility, marker alignment, orbit/pan/zoom, touch pinch, pointer-lock exit, repeated switches, default minimap, wheel/slider zoom, fixed wall labels, PDF-aligned plan annotations, surface picking and 3D ruler distances, finish differentiation, inherited themes, desktop/mobile including landscape, room viewpoints, settings, touch, reload/lock behavior, and direct viewer access. Browser tests need WebGL; a production build alone does not verify rendering.
