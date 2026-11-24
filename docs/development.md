# Developing pages and features

This guide covers how the site fits together and what conventions a new page should follow. For content-only edits (posts, About, gallery) see the [README](../README.md). House and Coffee have their own guides: [docs/house.md](house.md) and [docs/coffee-chat.md](coffee-chat.md).

## Layout of the repository

| Path | Purpose |
|---|---|
| `index.html`, `index.tsx`, `App.tsx` | Entry point, fonts, hash router, theme and Eye toggles, shared menu and footer |
| `pages/` | One component per routed page. A page may own a stylesheet (`pages/<name>.css`) |
| `components/` | Shared UI: `Menu`, `SocialLinks`, `PhotoViewer`, `Eye`, `CalendarDate`, and feature components |
| `data/`, `content/posts/` | Typed data (`posts.ts`, `gallery.ts`) and Markdown articles |
| `public/` | Static files served as-is (`/blog/…`, `/gallery/…`, `/house-viewer/…`) |
| `theme.css`, `portfolio.css` | Tailwind theme tokens and the shared portfolio stylesheet |
| `api/` | Vercel serverless functions. `server/` holds their shared logic and the local Vite middleware |
| `lib/` | House encryption, release and submission helpers |
| `scripts/` | House import scripts, browser checks and build-time gallery preparation |
| `house-viewer/` | Website-specific adapters copied into `public/house-viewer/` by `npm run house:import`. Don't edit the published copy directly |
| `tests/` | Node unit tests (`*.test.mjs`) and Playwright browser tests (`tests/browser/`) |

Pages that exist but aren't routed: `pages/Coffee.tsx` (hidden on purpose, see its guide).

## Add a page

Routing is a hash router in `App.tsx`; there is no router library.

1. Create `pages/<Name>.tsx` with a named export: `export function Name() { … }`.
2. In `App.tsx`:
   - add a lazy import next to the others:
     `const Name = lazy(() => import('./pages/Name').then(m => ({ default: m.Name })));`
   - add the hash to the `pages` map: `'#name': 'Name'`;
   - add a case to `renderPage()`: `case 'Name': return <Name />;`.
3. Add `'Name'` to the item list in `components/Menu.tsx` if it should appear in the menu. Leave it out for an unlisted page.
4. `document.title` becomes `<Name> — Zongnan Bao` automatically.

Lazy-load every page except Home so the gallery stays small. Fullscreen experiences (like House) can hide the shared menu, toggles and footer by extending the `currentPage !== 'House'` conditions in `App.tsx`.

## Visual style

The site is monochrome and editorial. Keep new pages consistent with Blog and About.

**Typography**
- Page titles: `<h1 className="portfolio-title">` (Rubik Spray Paint, uppercase, oversized).
- Body text: Rubik. Wrap a text page in `<div className="writing-page">`, which also sets the page width and top padding that clears the fixed menu.
- Mono accents: Major Mono Display (used only for the gallery wordmark).
- Chinese text: add `className="chinese-name"` or rely on the Yuji Boku fallback.
- Tailwind's `font-sans`, `font-serif` and `font-mono` all map to Rubik Spray Paint in `theme.css`. Use `font-rubik` for Rubik in Tailwind classes.

**Colour**

| Token | Light | Dark |
|---|---|---|
| Background | `#faf9f6` | `#101112` |
| Text | `#111111` | `#f3f4ef` |
| Raised surface | `#ffffff` | `#1a1b1e` |

Prefer `currentColor` with `color-mix()` for borders, rules and hover fills (as in `portfolio.css`). They follow the theme automatically.

**Dark mode.** The default theme is dark. `App.tsx` sets `data-theme` on `.app-theme` and overrides only these Tailwind classes in dark mode: `bg-[#faf9f6]`, `text-[#111]`, `text-black`, `border-black`, `border-black/10`, `border-black/20`, `border-black/60`, `bg-white`, `bg-white/90`, `hover:bg-black`, `hover:text-white`. Any other colour class won't change with the theme. Either stick to that list, use `currentColor`, or scope rules under `.app-theme[data-theme='dark']`. Check every new page in both themes.

**Motion.** Use `useGSAP` from `@gsap/react` (see `pages/About.tsx`) and wrap animations in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`. CSS transitions belong inside `@media (prefers-reduced-motion: no-preference)`.

**Icons.** Use `lucide-react`.

## Where styles go

1. **Tailwind utility classes** for one-off layout and spacing in a component.
2. **`portfolio.css`** for classes shared by more than one page (`writing-page`, `portfolio-title`, `post-*`, footer).
3. **`pages/<name>.css`**, imported by that page, for a page with its own substantial visual system (Coffee, House).

Avoid adding new `<style>` blocks or inline `style={{…}}` except for values computed at runtime (such as an aspect ratio CSS variable). Tailwind only scans `App.tsx`, `pages/` and `components/` (see `theme.css`); classes written elsewhere aren't generated.

## Accessibility and layout

- Use real elements: `<a href="#…">` for navigation, `<button>` for actions, `<dialog>` for overlays (see `Menu` and `PhotoViewer`).
- Give images `alt`, `width` and `height` so the layout doesn't shift while they load.
- Check widths of 320px, 390px and 1440px. There must be no horizontal scroll.
- Keep visible focus styles; don't remove outlines without a replacement.

## Data, assets and secrets

- Put content in `data/` as typed objects, not hard-coded inside JSX, when it may change or is listed.
- Put images in `public/<area>/` as `.webp`, and reference them with root-relative URLs (`/blog/…`).
- Never commit credentials. `.env.local` is ignored; document new variables in an `.env.*.example` file and the relevant guide.
- Never commit unencrypted House source material (PDFs, photos, Blender files, models). See [docs/house.md](house.md).

## Checks

```sh
npm run check        # TypeScript, Node unit tests, production build
npm run test:gallery # Playwright, desktop and phone (run `npx playwright install chromium` once)
```

Add a Node test in `tests/` for data and logic, and a Playwright test in `tests/browser/` for layout or interaction a page depends on. Then follow the preview and pull-request workflow in [AGENTS.md](../AGENTS.md).
