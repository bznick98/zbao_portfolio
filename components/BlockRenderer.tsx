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
  if (d.marginBottom) classes += `md:${d.marginBottom} `;
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
  
  useLayoutEffect(() => {
    const el = containerRef.current;
    
    if (!el) return;

    // 1. Fixed Element Fade Out (Keep this for the Header Name)
    if (block.isFixed) {
      gsap.to(el, {
        opacity: 0,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: '70% bottom',
          scrub: 1,
        }
      });
    }

    // 2. Parallax Effect (Keep subtle movement)
    if (block.parallaxSpeed && !block.isFixed) {
      gsap.to(el, {
        y: -100 * block.parallaxSpeed,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    }

  }, [block.parallaxSpeed, block.isFixed]);

  const gridClasses = getGridClasses(block.mobile, block.desktop);
  const finalClasses = `${gridClasses} ${className}`;

  if (block.type === 'spacer') {
    return <div className={finalClasses}></div>;
  }

  if (block.type === 'hero-text') {
    return (
      <div ref={containerRef} className={`${finalClasses} pointer-events-none`}>
        {/* 
           VISUAL COLOR LOGIC:
           To appear BLACK on a LIGHT background using 'mix-blend-difference', the text color must be WHITE (or Light).
           Math: | Light BG (250) - White Text (255) | = Dark Result (5).
           
           If we used Black Text (0): | Light BG (250) - Black Text (0) | = Light Result (250) -> This would look White.
        */}
        <h1 className="text-[10vw] md:text-[9vw] leading-normal font-normal uppercase text-white mix-blend-difference break-words">
          {block.content}
        </h1>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div ref={containerRef} className={`${finalClasses} flex flex-col gap-4`}>
        <h2 className="text-5xl md:text-7xl font-serif leading-tight text-white mix-blend-difference">
          {block.content}
        </h2>
        {block.caption && (
          <p className="font-mono text-sm tracking-wide uppercase opacity-60 text-white mix-blend-difference">
            {block.caption}
          </p>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    const aspectClass = block.customAspectRatio ? '' : (block.aspectRatio || 'aspect-[3/4]');
    const inlineStyle = block.customAspectRatio ? { aspectRatio: block.customAspectRatio } : undefined;

    return (
      <div ref={containerRef} className={finalClasses}>
        <div className="group relative">
          <div 
            className={`w-full ${aspectClass} overflow-hidden bg-[#e5e5e5] relative transition-all duration-500`}
            style={inlineStyle}
          >
            {block.src ? (
              <img 
                src={block.src} 
                alt={block.alt}
                className="w-full h-full object-cover transition-opacity duration-700 opacity-0"
                loading="lazy"
                onLoad={(e) => (e.target as HTMLImageElement).classList.remove('opacity-0')}
              />
            ) : (
              <div className="w-full h-full bg-[#e5e5e5] animate-pulse" />
            )}
          </div>
          
          {(block.caption || block.subCaption) && (
            <div className="mt-4 flex flex-col gap-1">
              {block.caption && (
                 <span className="font-serif text-lg md:text-xl italic text-white mix-blend-difference">{block.caption}</span>
              )}
              {block.subCaption && (
                 <span className="font-sans text-xs uppercase tracking-widest opacity-50 text-white mix-blend-difference">{block.subCaption}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
