import React from 'react';
import { galleryImages } from '../data/gallery';

export const Portfolio: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#0f0f0f]">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row gap-12">
        <aside className="md:w-64 flex-shrink-0 md:sticky md:top-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Zongnan Bao</h1>
            <p className="text-base text-black/70">鲍宗南</p>
          </div>

          <nav className="flex flex-col gap-2 text-sm uppercase tracking-[0.2em] text-black/60">
            <a href="#gallery" className="hover:text-black transition-colors">Gallery</a>
            <a href="#projects" className="hover:text-black transition-colors">Projects</a>
            <a href="#about" className="hover:text-black transition-colors">About</a>
            <a href="#contact" className="hover:text-black transition-colors">Contact</a>
          </nav>

          <div id="projects" className="space-y-4 pt-4 border-t border-black/10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-black/50">Projects</h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <div className="flex flex-col">
                <span className="font-medium">Blazaret Neural Operators</span>
                <span className="text-black/60">Research &amp; image systems</span>
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Focus Stacking</span>
                <span className="text-black/60">Computational photography study</span>
              </div>
            </div>
          </div>

          <div id="about" className="space-y-3 pt-4 border-t border-black/10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-black/50">About</h2>
            <p className="text-sm leading-relaxed text-black/70">
              Visual artist exploring the boundary between alpine silence and urban light. This selection captures
              work from recent expeditions and computational imaging studies that blend landscape, architecture, and
              nocturnal scenes.
            </p>
          </div>

          <div id="contact" className="space-y-3 pt-4 border-t border-black/10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-black/50">Contact</h2>
            <div className="flex flex-col text-sm gap-1">
              <a href="mailto:hello@zongnanbao.com" className="hover:underline">hello@zongnanbao.com</a>
              <a href="https://www.instagram.com" className="hover:underline" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          </div>

          <p className="text-xs text-black/40 pt-4">© 2024 Zongnan Bao</p>
        </aside>

        <section id="gallery" className="flex-1">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {galleryImages.map((image, index) => (
              <figure key={index} className="break-inside-avoid">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-auto rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.06)] bg-black/5"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
