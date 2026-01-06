import React, { useRef, useLayoutEffect } from 'react';
import { ContentBlock, GridPosition } from '../types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface BlockRendererProps {
  block: ContentBlock;
  className?: string; // Allow parent to inject fixed/layout classes
}

const getGridClasses = (mobile: GridPosition, desktop: GridPosition) => {
  const m = mobile;
  const d = desktop;
  
  // Base classes
  let classes = 'relative w-full ';
  
  // Mobile
  if (m.colSpan) classes += `${m.colSpan} `;
  if (m.marginTop) classes += `${m.marginTop} `;
  if (m.marginBottom) classes += `${m.marginBottom} `;
  if (m.alignSelf) classes += `self-${m.alignSelf} `;
  if (m.justifySelf) classes += `justify-self-${m.justifySelf} `;

  // Desktop (md:)
  if (d.colStart) classes += `md:${d.colStart} `;
  if (d.colSpan) classes += `md:${d.colSpan} `;
  if (d.rowStart) classes += `md:${d.rowStart} `;
  if (d.marginTop) classes += `md:${d.marginTop} `;
  if (d.alignSelf) classes += `md:self-${d.alignSelf} `;
  if (d.justifySelf) classes += `md:justify-self-${d.justifySelf} `;
  
  // Z-Index handling
  if (d.zIndex !== undefined) {
      classes += `z-[${d.zIndex}] `;
  } else {
      classes += `z-10 `;
  }

  return classes;
};

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    const img = imageRef.current;
    
    if (!el) return;

    // 1. Entrance Animation (General)
    // Only animate entrance if it's NOT fixed, fixed elements are there from start usually
    if (!block.isFixed) {
       gsap.fromTo(el, 
        { opacity: 0, y: 60 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 1, 
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 95%', // Trigger slightly earlier
            toggleActions: 'play none none reverse'
          }
        }
      );
    }

    // 2. Image Specific Reveals (Clip Path + Scale)
    if (block.type === 'image' && content && img) {
      // Reveal mask
      gsap.fromTo(content,
        { clipPath: 'inset(10% 10% 10% 10%)' }, // Start smaller
        {
          clipPath: 'inset(0% 0% 0% 0%)', // Expand to full
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          }
        }
      );

      // Scale Image inside container
      gsap.fromTo(img,
        { scale: 1.3 },
        {
          scale: 1,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          }
        }
      );
    }

    // 3. Parallax Effect (Vertical Movement)
    if (block.parallaxSpeed && !block.isFixed) {
      gsap.to(content || el, {
        y: -100 * block.parallaxSpeed,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true // Smooth scrubbing
        }
      });
    }

  }, [block.parallaxSpeed, block.type, block.isFixed]);

  const gridClasses = getGridClasses(block.mobile, block.desktop);
  // Merge generated grid classes with any passed via props (like fixed positioning overrides)
  const finalClasses = `${gridClasses} ${className}`;

  if (block.type === 'spacer') {
    return <div className={finalClasses}></div>;
  }

  if (block.type === 'hero-text') {
    return (
      <div ref={containerRef} className={`${finalClasses} mix-blend-difference pointer-events-none`}>
        <h1 className="text-[14vw] md:text-[13vw] leading-[0.8] font-bold tracking-tighter uppercase text-[#111] break-words">
          {block.content}
        </h1>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div ref={containerRef} className={`${finalClasses} flex flex-col gap-4 mix-blend-multiply`}>
        <h2 className="text-5xl md:text-7xl font-serif leading-tight">
          {block.content}
        </h2>
        {block.caption && (
          <p className="font-mono text-sm tracking-wide uppercase opacity-60">
            {block.caption}
          </p>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div ref={containerRef} className={finalClasses}>
        <div ref={contentRef} className="group relative overflow-hidden">
          <div className={`w-full ${block.aspectRatio || 'aspect-[3/4]'} overflow-hidden bg-[#e5e5e5]`}>
            <img 
              ref={imageRef}
              src={block.src} 
              alt={block.alt}
              className="w-full h-full object-cover will-change-transform"
              loading="lazy"
            />
          </div>
          
          <div className="mt-4 flex flex-col gap-1">
            {block.caption && (
               <span className="font-serif text-lg md:text-xl italic">{block.caption}</span>
            )}
            {block.subCaption && (
               <span className="font-sans text-xs uppercase tracking-widest opacity-50">{block.subCaption}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
