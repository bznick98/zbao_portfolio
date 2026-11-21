# Zongnan Bao’s portfolio

[Visit zbao.art](https://zbao.art). This is my photography portfolio and the home of my technical writing on computational photography, camera systems and image processing. My professional interests include Apple silicon performance modeling, hardware/software co-design and ML systems.

- **[Home](https://zbao.art/#home)** opens the photography gallery. Select a photo to see it at a larger size.
- **[About](https://zbao.art/#about)** collects my introduction, recent updates, experience, education and patent work.
- **[Blog](https://zbao.art/#blog)** contains project articles with figures, measurements and links to code. The bilateral image enhancement article also includes my UCLA capstone paper.
- **[Poe](https://zbao.art/#poe)** is an interactive divination experience. **[House](https://zbao.art/#house)** opens a password-gated Three.js walkthrough. See the [House guide](docs/house.md) for controls, model imports and access details.

## Run locally

Use Node.js 22.12 or later. Run these commands from the repository root.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Run `npm run check` for TypeScript, the regression suite and a production build. `npm run preview` serves the built frontend. Vercel serves the frontend and the functions under `api/` in production.

For browser regression checks, install Chromium once with `npx playwright install chromium`, then run `npm run test:gallery`. The suite checks layout before images load, refresh stability, native proportions, keyboard interaction and reduced motion at phone and desktop sizes.

The site uses React and Vite, with Tailwind CSS compiled at build time. About uses the official GSAP React hook and respects reduced-motion preferences. Articles render locally with React Markdown and GitHub Flavored Markdown tables.

## Edit content

- Add a post to the catalogue in `data/posts.ts`. Give it a title, publication date (`YYYY-MM-DD`), cover photograph, alt text and source links. Write the complete article in `content/posts/<slug>.md`. Put figures and papers in `public/blog/` and reference them with `/blog/…` URLs. Blog lists posts newest first. About combines the latest two with career updates in date order. Each article has a shareable URL at `/#blog/<slug>`.
- Edit the bio, career updates, experience and education in `pages/About.tsx`. The four contact icons are in `components/SocialLinks.tsx`.
- Home selects photographs from [@zbao on Unsplash](https://unsplash.com/@zbao) once per production build. Set `UNSPLASH_ACCESS_KEY` and `OPENAI_API_KEY` in the build environment. Existing `VITE_UNSPLASH_ACCESS_KEY` settings are also supported. One text-only model request titles the collection. The year comes from the Unsplash publication date. Failed title generation uses Unsplash metadata, and a failed selection uses the verified collection in `data/unsplash-snapshot.json`. Local development uses the snapshot directly.
- The Coffee page is hidden. Its existing calendar integration is documented in the [coffee setup guide](docs/coffee-chat.md).
