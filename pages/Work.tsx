import React, { useLayoutEffect, useMemo } from 'react';
import { BLOCKS } from '../data/content';
import { BlockRenderer } from '../components/BlockRenderer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Work: React.FC = () => {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, []);

  const { fixedBlocks, scrollBlocks } = useMemo(() => {
    return {
      fixedBlocks: BLOCKS.filter(b => b.isFixed),
      scrollBlocks: BLOCKS.filter(b => !b.isFixed)
    };
  }, []);

  return (
    <div className="w-full">
      <div className="max-w-[1800px] mx-auto relative">
        {/* LAYER 0: FIXED HERO CONTENT */}
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 px-4 md:px-12 pt-24 md:pt-32">
            <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 w-full h-full">
              {fixedBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
        </div>

        {/* LAYER 1: SCROLLING CONTENT */}
        <div className="relative z-10 px-4 md:px-12 pb-24 pt-24 md:pt-32">
          <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 gap-y-0 auto-rows-min">
            {scrollBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
          
          <footer className="w-full py-12 border-t border-black/10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mt-32 bg-[#faf9f6]">
            <div className="flex flex-col gap-2">
              <span className="font-serif italic text-2xl">Zongnan Bao</span>
              <span className="text-sm uppercase tracking-widest opacity-50">Visual Artist & Director</span>
            </div>

            <div className="flex gap-6 text-sm font-medium uppercase tracking-wide">
              <a href="#" className="hover:underline">Instagram</a>
              <a href="#" className="hover:underline">LinkedIn</a>
              <a href="#" className="hover:underline">Email</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};