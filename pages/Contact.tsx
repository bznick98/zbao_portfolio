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

  const socialLinks = [
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/zongnanbao/' },
    { name: 'GitHub', url: 'https://github.com/bznick98' },
    { name: 'Instagram', url: 'https://www.instagram.com/zbao98/' },
    { name: 'YouTube', url: 'https://www.youtube.com/channel/UCaU7e-Lj5ezOhyfrPszojlg' },
    { name: 'Unsplash', url: 'https://unsplash.com/@nick19981122' },
  ];

  return (
    <div ref={containerRef} className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6] flex flex-col justify-between text-[#111]">
      <div className="max-w-[1800px] w-full mx-auto">
         {/* Title - Consistent Artistic Style */}
         <h1 className="contact-anim text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase mb-8 md:mb-16 text-white mix-blend-difference">Contact</h1>
         
         {/* Content - Rubik for readability */}
         <div className="contact-anim grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 font-rubik">
             <div className="flex flex-col gap-8">
                 <p className="text-xl md:text-2xl leading-relaxed max-w-md">
                     Let's create something meaningful together.
                 </p>
                 <a href="mailto:zongnan.bao@gmail.com" className="text-xl md:text-3xl font-bold underline underline-offset-8 hover:text-white/60 transition-colors break-words text-white mix-blend-difference">
                     zongnan.bao<br/>@gmail.com
                 </a>
             </div>

             <div className="flex flex-col gap-6 items-start md:items-end">
                {socialLinks.map((social) => (
                    <a 
                        key={social.name} 
                        href={social.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 text-xl uppercase tracking-wide group hover:text-white/60 transition-colors text-white mix-blend-difference"
                    >
                        <span className="group-hover:underline">{social.name}</span>
                        <ArrowUpRight className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/>
                    </a>
                ))}
             </div>
         </div>
      </div>

      <div className="contact-anim text-center mt-24 opacity-50 text-sm uppercase tracking-widest font-rubik text-white mix-blend-difference">
         © 2026 Zongnan Bao. All Rights Reserved.
      </div>
    </div>
  );
};
