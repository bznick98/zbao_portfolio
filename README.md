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

The site uses React and Vite, with Tailwind CSS compiled at build time. About uses the official GSAP React hook and respects reduced-motion preferences. Articles render locally with React Markdown and GitHub Flavored Markdown tables.

## Edit content

- Add a post to the beginning of `posts` in `data/posts.ts`. Give it a title, publication date, cover photograph, alt text and source links. Write the complete article in `content/posts/<slug>.md`. Put figures and papers in `public/blog/` and reference them with `/blog/…` URLs. The Blog index lists every entry, and About picks up the latest two. Each article has a shareable URL at `/#blog/<slug>`.
- Edit the bio, career updates, experience and education in `pages/About.tsx`. The four contact icons are in `components/SocialLinks.tsx`.
- Edit the gallery in `data/gallery.ts`. Ten local photographs come from my [earlier portfolio](https://github.com/bznick98/bznick98.github.io/tree/master/images/gallery). An optional Unsplash access key (`VITE_UNSPLASH_ACCESS_KEY`) loads a rotating selection with the local photos as a fallback. Automatic captions use the server-side `OPENAI_API_KEY` on Vercel.
- The Coffee page is hidden. Its existing calendar integration is documented in the [coffee setup guide](docs/coffee-chat.md).
