# House — Interactive Artifacts

Open `/#house` and enter the existing shared password. The fullscreen viewer defaults to Walkthrough and design revision 0.2. Revision 0.1 retains the original fitout materials; 0.2 uses teak floors and the white model. Both use their verified layout, navigation, face dimensions and camera metadata. The website preserves the source materials instead of applying a separate finish overlay, so revision differences agree with the layout2house demo. Real-time lighting and the placeholder sky still differ from a final Cycles render.

## Controls

Walkthrough / Model and the revision dropdown share one horizontal group. On phones the entire group moves below the top-left toolbar. The round top-right menu contains room selection, quality, lens zoom, fullscreen, lock and website navigation. EN/CN, dimensions, ruler and the direct minimap toggle remain readily accessible. The minimap is 300px on desktop and 182px on phones; its icon and Settings checkbox stay synchronized. Its visibility survives mode/revision changes and reloads.

Model mode shows an empty architectural shell derived from the same model, with orbit/pan/zoom and a marker at the saved walking pose. Returning restores position, direction and lens zoom. Revision changes preserve a safe pose, language, mode, zoom and tool settings; an old ruler measurement clears. The scene, collision data, room list, map and dimensions change together. Each revision model downloads only when selected; the viewer keeps a bounded two-entry raw-model cache.

Dimensions include every eligible vertical face, including short walls, lintels and narrow returns. The current two revisions each contain 432 measured faces from 108 target objects. Width and height are separate dimension lines with plain numeric millimetre values at their midpoints. Numbers and strokes stay fixed on the wall, with no floating W × H labels. Bevels affect these actual model-face extents. They are not automatically room clearances or surveyed heights. The separate Model-mode drawing overlay retains its source-PDF meanings.

The 864 raw width/height dimensions pass through a deterministic model-space filter before batching. Nearby equal-length, aligned dimensions share one representative (within 350 mm, parallel planes within 80 mm); opposite-facing room sides and distinct values stay separate. Each removal records its representative. The complete measurement manifest remains intact. Overlapping text uses fixed alternate wall-space lanes and uniform scaling at load time, preserving line midpoint, value and glyph aspect. This cannot guarantee no projected overlap from every possible viewing angle. Retained dimensions stay in two static GPU draw objects while enabled. A line endpoint leaving the viewport or being covered no longer hides its whole dimension. Ordinary GPU depth and viewport clipping affect only the obscured/offscreen pixels. There is no camera-dependent label packing, cutoff, priority selection or geometry-buffer rewrite. Small faces use fixed lanes and uniform text scaling during initial drafting. Normal perspective can still make distant or oblique text small.

The text atlas, line gap and world-space quad use the same measured font aspect ratio. There is no character-count width estimate or canvas maxWidth squeezing. AO geometry excludes annotation quads so text does not create rectangular shading. Camera/zoom tests assert all dimension submissions and attribute versions remain unchanged; source raster tests independently verify offscreen endpoints, partial/opaque/glass occlusion and matching atlas/world aspect ratios.

## Design previews

After unlocking House, open Settings → **Design previews / 设计效果图**. The
gallery contains the current living-room limestone-look/teak comparison, dining
and kitchen proposals, plus the three original-model camera renders. These are
GPT design targets awaiting feedback, not an implemented interior-design revision.
The 3D viewer still uses verified revisions 0.1 and 0.2; no new styled GLB or tour
is implied. The two workflow diagrams are not part of this website update.

The gallery downloads only when opened. Its HTML and all seven images are held in
one encrypted resource, under the same House password. Closing it restores the
same 3D iframe, pose and zoom. Locking destroys both frames and cancels pending
downloads. The gallery runs without parent-DOM or network access. Source photos,
PDFs and raw model files are not added to public assets.

Update the gallery after importing a model release:
`npm run house:designs -- /path/to/layout2house`
Supply the existing password through stdin. This reads the current
`projects/zhijiang/reference/interior/concepts/tuscan-materials-v2/manifest.json`,
verifies the seven image hashes, and adds the gallery to the existing encrypted
catalog. It preserves model ciphertext and selected model builds. Re-running the
base `house:import` replaces the catalog, so run `house:designs` afterward when the
design previews should remain available. Source hashes/import reports are local
under ignored `artifacts/house-documents/`.

Run `npm run check`, then serve the production build and run
`node scripts/check-house-designs.mjs <origin>` with the password on stdin. The
browser check covers 1440px, 390px and 320px, lazy loading, all image comparisons,
unchanged walk pose, frame isolation, and locking. The existing full House browser
check remains the regression check for revisions, dimensions and navigation.

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

## Import a revision report

Run `node scripts/import-house-report.mjs /path/to/report-manifest.json` with the existing House password on standard input. The schema 1 manifest contains `projectId`, `revisionId`, `revisionDigest`, `title`, a `pdf` entry with its path and SHA-256, and a `pages` array with a title, path and SHA-256 for each page JPEG. The importer verifies the frozen revision and files before encrypting them. The viewer loads the open page on demand and fetches the PDF when the visitor downloads it.

## Saved design suggestions

Tap **+** in the bottom Suggestions bar, choose a location, add a comment or reference images, and press **Save**. **Point** picks a surface detail, **Draw** lets you drag one freehand stroke directly on visible model surfaces, and **Object** picks a whole modeled asset. Lift to open the comment editor. **Change location** replaces the selection while preserving your text and attachments.

Select a list entry to return to its revision and camera, or click a highlight to edit where you are. Choose **Delete** beside a list entry or inside the saved comment editor and confirm. Deletion removes its saved comment, reference images and highlight from this browser profile. Local House storage is encrypted. The list numbers can change after deletion. A suggestion’s UUID stays the same across edits.

**Export JSON** downloads schema version 5. Each entry carries the exact model identity, text, reference images, selected geometry, camera and a marked JPEG for visual cross-checks. Point records store each hit under `region.points`. Draw records group ordered surface hits by mesh and instance under `region.segments`. Object records include the asset identity, mesh members, picked anchor and world bounds. A closed brush stroke records its line. Use the comment to interpret which surfaces the user wants changed. Previously saved rectangles remain reviewable and export with their original geometry.
