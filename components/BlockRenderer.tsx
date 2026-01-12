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
  const captionRef = useRef<HTMLDivElement>(null);
  const heroTopRef = useRef<HTMLSpanElement>(null);
  const heroMidRef = useRef<HTMLSpanElement>(null);
  const heroBottomRef = useRef<HTMLSpanElement>(null);
  
  useLayoutEffect(() => {
    const el = containerRef.current;
    
    if (!el) return;

    // 1. Fixed Element Fade Out (Keep this for the Header Name)
    if (block.isFixed) {
      const fadeTarget = el.querySelector('[data-blend-fade]');
      if (!fadeTarget) return;
      gsap.to(fadeTarget, {
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

  useLayoutEffect(() => {
    const el = captionRef.current;

    if (!el || !(block.caption || block.subCaption)) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%'
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === el) {
          trigger.kill();
        }
      });
    };
  }, [block.caption, block.subCaption]);

  useLayoutEffect(() => {
    if (block.type !== 'hero-text') return;
    const container = containerRef.current;
    const top = heroTopRef.current;
    const mid = heroMidRef.current;
    const bottom = heroBottomRef.current;

    if (!container || !top || !mid || !bottom) return;

    gsap.set(top, { clipPath: 'inset(0 0 66% 0)' });
    gsap.set(mid, { clipPath: 'inset(34% 0 34% 0)' });
    gsap.set(bottom, { clipPath: 'inset(66% 0 0 0)' });
    gsap.set([top, mid, bottom], { x: 0 });

    const moveTop = gsap.quickTo(top, 'x', { duration: 0.25, ease: 'sine.out' });
    const moveMid = gsap.quickTo(mid, 'x', { duration: 0.25, ease: 'sine.out' });
    const moveBottom = gsap.quickTo(bottom, 'x', { duration: 0.25, ease: 'sine.out' });
    const skewTop = gsap.quickTo(top, 'skewX', { duration: 0.25, ease: 'sine.out' });
    const skewMid = gsap.quickTo(mid, 'skewX', { duration: 0.25, ease: 'sine.out' });
    const skewBottom = gsap.quickTo(bottom, 'skewX', { duration: 0.25, ease: 'sine.out' });

    const handleMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      const relX = (event.clientX - bounds.left) / bounds.width;
      const relY = (event.clientY - bounds.top) / bounds.height;
      const offsetX = (relX - 0.5) * 2;
      const cursorY = relY * bounds.height;

      const sliceCenters = [
        bounds.height * 0.17,
        bounds.height * 0.5,
        bounds.height * 0.83
      ];
      const maxShift = bounds.width * 0.08;

      const shifts = sliceCenters.map((center) => {
        const distance = Math.abs(cursorY - center);
        const falloff = gsap.utils.clamp(0, 1, 1 - distance / (bounds.height * 0.6));
        return offsetX * maxShift * falloff;
      });

      moveTop(shifts[0]);
      moveMid(shifts[1] * -0.85);
      moveBottom(shifts[2]);

      skewTop(offsetX * -6);
      skewMid(offsetX * 4);
      skewBottom(offsetX * -6);
    };

    const handleLeave = () => {
      gsap.to([top, mid, bottom], { x: 0, skewX: 0, duration: 0.35, ease: 'sine.out' });
    };

    container.addEventListener('pointermove', handleMove);
    container.addEventListener('pointerleave', handleLeave);

    return () => {
      container.removeEventListener('pointermove', handleMove);
      container.removeEventListener('pointerleave', handleLeave);
    };
  }, [block.type]);

  const gridClasses = getGridClasses(block.mobile, block.desktop);
  const finalClasses = `${gridClasses} ${className}`;

  if (block.type === 'spacer') {
    return <div className={finalClasses}></div>;
  }

  if (block.type === 'hero-text') {
    // Add text alignment based on block id
    let alignClass = '';
    if (block.id === 'hero-zongnan') alignClass = 'text-left';
    if (block.id === 'hero-bao') alignClass = 'text-right';

    return (
      <div
        ref={containerRef}
        className={`${finalClasses} text-[6vw] md:text-[4vw] leading-normal font-normal uppercase break-words ${alignClass} cursor-pointer select-none`}
      >
        <span className="relative inline-block">
          <span className="opacity-0 block">{block.content}</span>
          <span
            ref={heroTopRef}
            className="absolute inset-0 block will-change-transform"
            aria-hidden="true"
          >
            {block.content}
          </span>
          <span
            ref={heroMidRef}
            className="absolute inset-0 block will-change-transform"
            aria-hidden="true"
          >
            {block.content}
          </span>
          <span
            ref={heroBottomRef}
            className="absolute inset-0 block will-change-transform"
            aria-hidden="true"
          >
            {block.content}
          </span>
        </span>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div ref={containerRef} className={`${finalClasses} flex flex-col gap-4`}>
        <h2 className="text-5xl md:text-7xl font-serif leading-tight text-[#111]">
          {block.content}
        </h2>
        {block.caption && (
          <p className="font-mono text-sm tracking-wide uppercase opacity-60 text-black mix-blend-difference">
            {block.caption}
          </p>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    const useNaturalAspectRatio = block.useNaturalAspectRatio;
    const aspectClass = useNaturalAspectRatio
      ? ''
      : block.customAspectRatio
        ? ''
        : (block.aspectRatio || 'aspect-[3/4]');
    const inlineStyle = useNaturalAspectRatio
      ? undefined
      : block.customAspectRatio
        ? { aspectRatio: block.customAspectRatio }
        : undefined;
    const imageClassName = useNaturalAspectRatio
      ? 'w-full h-auto object-contain transition-opacity duration-700 opacity-0'
      : 'w-full h-full object-cover transition-opacity duration-700 opacity-0';

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
                className={imageClassName}
                loading="lazy"
                onLoad={(e) => (e.target as HTMLImageElement).classList.remove('opacity-0')}
              />
            ) : (
              <div className="w-full h-full bg-[#e5e5e5] animate-pulse" />
            )}
          </div>
          
          <div
            ref={captionRef}
            className="mt-4 flex min-h-[3.5rem] flex-col gap-1 opacity-0"
          >
            {block.caption && (
              <span className="font-serif text-lg md:text-xl italic text-[#111]">{block.caption}</span>
            )}
            {block.subCaption && (
              <span className="font-sans text-xs uppercase tracking-widest opacity-50 text-[#111]">{block.subCaption}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
