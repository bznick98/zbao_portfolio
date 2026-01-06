import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowUpRight } from 'lucide-react';

export const Contact: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
        gsap.fromTo('.contact-anim', 
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6] flex flex-col justify-between">
      <div className="max-w-[1800px] w-full mx-auto">
         <h1 className="contact-anim text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase mb-8 md:mb-16">Contact</h1>
         
         <div className="contact-anim grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
             <div className="flex flex-col gap-8">
                 <p className="text-xl md:text-2xl font-serif max-w-md">
                     Available for commissions and collaborations worldwide. Let's create something meaningful together.
                 </p>
                 <a href="mailto:hello@zongnanbao.com" className="text-4xl md:text-6xl font-bold underline underline-offset-8 hover:opacity-70 transition-opacity break-words">
                     hello@<br/>zongnanbao.com
                 </a>
             </div>

             <div className="flex flex-col gap-6 items-start md:items-end">
                {['Instagram', 'Twitter', 'LinkedIn', 'Behance'].map((social) => (
                    <a key={social} href="#" className="flex items-center gap-2 text-xl uppercase tracking-wide group">
                        <span className="group-hover:underline">{social}</span>
                        <ArrowUpRight className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/>
                    </a>
                ))}
             </div>
         </div>
      </div>

      <div className="contact-anim text-center mt-24 opacity-50 text-sm uppercase tracking-widest">
         © 2024 Zongnan Bao. All Rights Reserved.
      </div>
    </div>
  );
};