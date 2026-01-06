import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export const Profile: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
        gsap.fromTo('.profile-anim', 
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-x-4 md:gap-x-8">
        
        {/* Title */}
        <div className="col-span-12 mb-16 md:mb-32">
            <h1 className="profile-anim text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase">Profile</h1>
        </div>

        {/* Content */}
        <div className="col-span-12 md:col-span-5 md:col-start-2 profile-anim">
             <div className="aspect-[3/4] w-full bg-gray-200 overflow-hidden mb-8">
                <img src="https://picsum.photos/seed/profile/800/1200" alt="Zongnan Bao" className="w-full h-full object-cover" />
             </div>
        </div>

        <div className="col-span-12 md:col-span-5 md:col-start-8 flex flex-col justify-end gap-8 profile-anim">
            <p className="text-2xl md:text-4xl font-serif leading-tight">
                Zongnan Bao is a multidisciplinary visual artist and director whose work explores the tension between organic forms and digital rigidity.
            </p>
            <p className="text-lg opacity-70 leading-relaxed max-w-md">
                Based in nowhere, working everywhere. With a background in fine arts and a passion for interactive media, Bao creates immersive experiences that challenge perception and invite the viewer to look closer.
            </p>
            
            <div className="mt-12 flex flex-col gap-4">
                <div className="border-t border-black/20 pt-4 flex justify-between">
                    <span className="uppercase tracking-widest text-sm">Services</span>
                    <span className="font-serif italic">Art Direction, Photography, Web Design</span>
                </div>
                <div className="border-t border-black/20 pt-4 flex justify-between">
                    <span className="uppercase tracking-widest text-sm">Selected Clients</span>
                    <span className="font-serif italic">Vogue, Acne Studios, Aesop</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};