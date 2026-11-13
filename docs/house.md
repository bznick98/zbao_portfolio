# House — Interactive Artifacts

Open `/#house` and enter the existing shared password. The fullscreen viewer defaults to Walkthrough and design revision 0.2. Revision 0.1 retains the original fitout materials; 0.2 uses teak floors and the white model. Both use their verified layout, navigation, face dimensions and camera metadata. The website preserves the source materials instead of applying a separate finish overlay, so revision differences agree with the layout2house demo. Real-time lighting and the placeholder sky still differ from a final Cycles render.

## Controls

Walkthrough / Model and the revision dropdown share one horizontal group. On phones the entire group moves below the top-left toolbar. The round top-right menu contains room selection, quality, lens zoom, fullscreen, lock and website navigation. EN/CN, dimensions, ruler and the direct minimap toggle remain readily accessible. The minimap is 300px on desktop and 182px on phones; its icon and Settings checkbox stay synchronized. Its visibility survives mode/revision changes and reloads.

Model mode shows an empty architectural shell derived from the same model, with orbit/pan/zoom and a marker at the saved walking pose. Returning restores position, direction and lens zoom. Revision changes preserve a safe pose, language, mode, zoom and tool settings; an old ruler measurement clears. The scene, collision data, room list, map and dimensions change together. Each revision model downloads only when selected; the viewer keeps a bounded two-entry raw-model cache.

Dimensions include every eligible vertical face, including short walls, lintels and narrow returns. The current two revisions each contain 432 measured faces from 108 target objects. Width and height are separate dimension lines with plain numeric millimetre values at their midpoints. Numbers and strokes stay fixed on the wall, with no floating W × H labels. Bevels affect these actual model-face extents. They are not automatically room clearances or surveyed heights. The separate Model-mode drawing overlay retains its source-PDF meanings.

The 864 raw width/height dimensions pass through a deterministic model-space filter before batching. Nearby equal-length, aligned dimensions share one representative (within 350 mm, parallel planes within 80 mm); opposite-facing room sides and distinct values stay separate. Each removal records its representative. The complete measurement manifest remains intact. Overlapping text uses fixed alternate wall-space lanes and uniform scaling at load time, preserving line midpoint, value and glyph aspect. This cannot guarantee no projected overlap from every possible viewing angle. Retained dimensions stay in two static GPU draw objects while enabled. A line endpoint leaving the viewport or being covered no longer hides its whole dimension. Ordinary GPU depth and viewport clipping affect only the obscured/offscreen pixels. There is no camera-dependent label packing, cutoff, priority selection or geometry-buffer rewrite. Small faces use fixed lanes and uniform text scaling during initial drafting. Normal perspective can still make distant or oblique text small.

The text atlas, line gap and world-space quad use the same measured font aspect ratio. There is no character-count width estimate or canvas maxWidth squeezing. AO geometry excludes annotation quads so text does not create rectangular shading. Camera/zoom tests assert all dimension submissions and attribute versions remain unchanged; source raster tests independently verify offscreen endpoints, partial/opaque/glass occlusion and matching atlas/world aspect ratios.

## Private resources

The public release is schema 2. It contains an encrypted catalog and encrypted assets with opaque IDs. Model files, scene/navigation metadata, wall measurements, plan SVGs and route SVGs are all AES-256-GCM encrypted, with separate random nonces and authenticated resource identities. A PBKDF2-SHA-256 key uses a random salt and 600,000 iterations. No password or reusable key is shipped.

Unlock first decrypts the small catalog. A wrong password downloads no scene or model. The parent page retains a non-extractable session key in memory and serves authenticated iframe requests for explicitly declared resources. Only the selected model is downloaded and decrypted. The iframe receives catalog metadata and transferable bytes, not the key or password. Map/route links open decrypted SVGs only after unlock. Lock, navigation and reload discard the session, cancel resource requests and remove the iframe. Storage contains UI preferences, never decrypted resources or credentials.

This remains a static shared-password convenience gate, not server-side authentication. It retains the existing password behavior and limitations. Public code/vendor files remain accessible; source PDFs, photos, Blender files and unencrypted house artifacts must not enter the repository.

## Update from layout2house

1. Work in the canonical layout2house repository with an explicit project ID. Build and validate each selected revision with `wf:web`, including the dimension browser check. Assemble with `npm run rev -- site --project <id>`.
2. Import the versioned delivery directory:
   `npm run house:import -- /path/to/projects/<id>/output/deliveries/interactive-ID`
   Supply the existing password through stdin from a private prompt/secret manager, never a command argument or tracked file. The importer checks delivery hashes, selected-build identity, navigation/camera reports, GLB validation and desktop/mobile web/dimension reports. Only each revision's selected build is published; intermediate history remains in layout2house.
3. The importer copies the verified runtime/vendor files and applies explicit website adapters for the private resource bridge, theme, zoom and lock. It encrypts the catalog, selected models/scenes and available map/route artifacts. `public/house-viewer/provenance.json` records source delivery/runtime hashes and selected build IDs. Source change mismatches fail the integration instead of silently applying an outdated patch.
4. Run `npm run check` (TypeScript, regression tests, production build). Serve `dist` and run `node scripts/check-house-browser.mjs <origin>` with the password on stdin. Screenshots/reports stay in ignored `artifacts/house/`.
5. Review the diff and update a PR with explicit GitHub-write authorization. Inspect its deployment preview before any separately authorized merge.

Browser checks cover password rejection, no early model downloads, desktop/mobile and 320px controls, both modes, exact pose/zoom restoration, EN/CN, source dimensions/ruler, lazy encrypted revisions, minimap persistence, private map export, theme, touch, locking/reload and direct viewer access. Unit tests also cover resource cancellation, integrity, path restrictions and absence of plaintext artifacts. These checks do not establish architectural correspondence with every PDF/photo dimension.

The website uses its existing Vite/Vercel build. No Blender or new House environment variable is required in deployment. Use a supported Node runtime (22.12+). The source viewer vendors Three.js 0.180.0 and three-mesh-bvh 0.9.18 separately from the portfolio's Three.js, with runtime and texture licenses retained.
