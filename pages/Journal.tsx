import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const ENTRIES = [
    { date: 'Oct 2024', title: 'The Silence of Objects', category: 'Thought' },
    { date: 'Sep 2024', title: 'Visual Noise in the Digital Age', category: 'Essay' },
    { date: 'Aug 2024', title: 'Reflections on Light', category: 'Photography' },
    { date: 'Jul 2024', title: 'Process: Behind the Scenes', category: 'Work' },
    { date: 'Jun 2024', title: 'Defining Modern Brutalism', category: 'Design' },
];

export const Journal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
        gsap.fromTo('.journal-row', 
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="journal-row text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase mb-24 text-black mix-blend-difference">Journal</h1>

        <div className="w-full">
            <div className="grid grid-cols-12 border-b border-black pb-4 mb-4 text-sm uppercase tracking-widest opacity-50 journal-row text-black mix-blend-difference">
                <div className="col-span-2">Date</div>
                <div className="col-span-8">Title</div>
                <div className="col-span-2 text-right">Category</div>
            </div>

            {ENTRIES.map((entry, i) => (
                <div key={i} className="journal-row group grid grid-cols-12 py-8 border-b border-black/10 items-baseline hover:bg-white transition-colors duration-300 cursor-pointer">
                    <div className="col-span-2 font-mono text-sm opacity-60 text-black mix-blend-difference">{entry.date}</div>
                    <div className="col-span-8 text-3xl md:text-5xl font-serif group-hover:italic transition-all duration-300 text-black mix-blend-difference">{entry.title}</div>
                    <div className="col-span-2 text-right text-xs uppercase tracking-widest border border-black/20 rounded-full py-1 px-3 self-center justify-self-end text-black mix-blend-difference">{entry.category}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
