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
  const heroOverlayRef = useRef<HTMLSpanElement>(null);
  
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
    const overlay = heroOverlayRef.current;

    if (!container || !overlay) return;

    const closedClip = 'polygon(50% 0, 50% 0, 50% 100%, 50% 100%)';

    gsap.set(overlay, {
      clipPath: closedClip,
      yPercent: 0
    });

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      const relativeX = event.clientX - bounds.left;
      const percent = gsap.utils.clamp(0, 100, (relativeX / bounds.width) * 100);
      const sliceWidth = 24;
      const left = Math.max(0, percent - sliceWidth / 2);
      const right = Math.min(100, percent + sliceWidth / 2);
      const waveOffset = Math.sin((percent / 100) * Math.PI * 2) * 8;

      gsap.to(overlay, {
        clipPath: `polygon(${left}% 0, ${right}% 0, ${right}% 100%, ${left}% 100%)`,
        yPercent: waveOffset,
        duration: 0.25,
        ease: 'power2.out'
      });
    };

    const handlePointerLeave = () => {
      gsap.to(overlay, {
        clipPath: closedClip,
        yPercent: 0,
        duration: 0.5,
        ease: 'power3.out'
      });
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
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
        className={`${finalClasses} text-[6vw] md:text-[4vw] leading-normal font-normal uppercase break-words ${alignClass} relative select-none cursor-pointer`}
      >
        <span className="relative z-10 block">{block.content}</span>
        <span
          ref={heroOverlayRef}
          className="absolute inset-0 z-20 block text-[#111] mix-blend-multiply"
        >
          {block.content}
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
