import React, { useLayoutEffect, useMemo, useState, useEffect, useRef } from 'react';
import { BLOCKS } from '../data/content';
import { BlockRenderer } from '../components/BlockRenderer';
import { ContentBlock } from '../types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURATION ---

// 1. ENVIRONMENT VARIABLES
// Create a .env.local file in your root directory to store these keys securely.
// Example:
// VITE_UNSPLASH_ACCESS_KEY=your_key_here

const UNSPLASH_ACCESS_KEYS = [
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_1,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_2,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_3,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_4,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_5
].filter(Boolean) as string[];
const UNSPLASH_USERNAME = 'zbao';

export const Work: React.FC = () => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(BLOCKS);
  const [selectedImageBlock, setSelectedImageBlock] = useState<ContentBlock | null>(null);
  const [transitionImage, setTransitionImage] = useState<(ContentBlock & {
    startRect: { top: number; left: number; width: number; height: number };
  }) | null>(null);
  const transitionImageRef = useRef<HTMLImageElement>(null);
  const hasInitializedRef = useRef(false);
  const captionsRequestedRef = useRef(false);

  // Unsplash Fetch & GenAI Generation Logic
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    if (UNSPLASH_ACCESS_KEYS.length === 0) {
      console.warn('Unsplash Integration: No Access Key found in environment variables (VITE_UNSPLASH_ACCESS_KEY...). Using placeholder content.');
      return;
    }

    const initContent = async () => {
      try {
        // Identify how many image blocks we need to fill
        const imageBlockCount = BLOCKS.filter(b => b.type === 'image').length;

        // --- STEP 1: Fetch photos from Unsplash ---
        // Use /photos/random endpoint to ensure true randomness across the entire portfolio
        let data: any = null;
        let lastError: Error | null = null;

        for (const accessKey of UNSPLASH_ACCESS_KEYS) {
          try {
            const response = await fetch(
              `https://api.unsplash.com/photos/random?username=${UNSPLASH_USERNAME}&count=${imageBlockCount}&client_id=${accessKey}`
            );

            if (!response.ok) {
              lastError = new Error(`Unsplash API request failed (${response.status})`);
              continue;
            }

            data = await response.json();
            break;
          } catch (error) {
            lastError = error as Error;
          }
        }

        if (!data) {
          throw lastError || new Error('Unsplash API request failed');
        }
        
        // Normalize data
        const selectedPhotos = Array.isArray(data) ? data : [data];
        
        if (selectedPhotos.length > 0) {
          const applyPhotoUpdates = (captions: string[] = []) => {
            setBlocks(prevBlocks => {
              let imgIndex = 0;
              return prevBlocks.map(block => {
                if (block.type === 'image' && imgIndex < selectedPhotos.length) {
                  const photo = selectedPhotos[imgIndex];
                  const finalCaption = captions[imgIndex] || '';

                  // Extract Year
                  const year = photo.created_at ? new Date(photo.created_at).getFullYear() : new Date().getFullYear();

                  imgIndex++;

                  const captionValue = finalCaption ? `${finalCaption} (${year})` : undefined;

                  return {
                    ...block,
                    src: photo.urls.regular,
                    alt: photo.alt_description || 'Portfolio Work',
                    caption: captionValue
                  };
                }
                return block;
              });
            });
          };

          // --- STEP 2: Update UI immediately with images (no titles yet) ---
          applyPhotoUpdates();

          // --- STEP 3: Generate Poetic Captions using OpenAI via serverless API ---
          if (!captionsRequestedRef.current) {
            captionsRequestedRef.current = true;
            const generateCaptions = async () => {
              try {
                // Prepare context for the model
                const descriptions = selectedPhotos.map((p: any) => p.description || p.alt_description || 'Poetic image description');

                // Call serverless API (keeps key off the client)
                const response = await fetch('/api/generate-captions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    descriptions
                  })
                });

                if (!response.ok) {
                  throw new Error('OpenAI API request failed');
                }

                const data = await response.json();
                if (Array.isArray(data?.titles)) {
                  const generatedCaptions = data.titles;
                  applyPhotoUpdates(generatedCaptions);
                }
              } catch (e) {
                console.error("OpenAI generation failed:", e);
              }
            };

            generateCaptions();
          }
        }
      } catch (error) {
        console.error('Failed to fetch/process content:', error);
      }
    };

    initContent();
  }, []); // Run once on mount (refresh)

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Refresh ScrollTrigger after a slight delay to ensure DOM is ready and images might be loading
    const timer = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => clearTimeout(timer);
  }, [blocks]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImageBlock(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedImageBlock || transitionImage ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedImageBlock, transitionImage]);

  useEffect(() => {
    if (!transitionImage || !transitionImageRef.current) return;
    const animatedImage = transitionImageRef.current;

    const ratio = transitionImage.startRect.width / transitionImage.startRect.height;
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.78;

    let targetWidth = maxW;
    let targetHeight = targetWidth / ratio;
    if (targetHeight > maxH) {
      targetHeight = maxH;
      targetWidth = targetHeight * ratio;
    }

    const targetLeft = (window.innerWidth - targetWidth) / 2;
    const targetTop = (window.innerHeight - targetHeight) / 2;

    const animation = gsap.fromTo(
      animatedImage,
      {
        top: transitionImage.startRect.top,
        left: transitionImage.startRect.left,
        width: transitionImage.startRect.width,
        height: transitionImage.startRect.height,
        borderRadius: 10
      },
      {
        top: targetTop,
        left: targetLeft,
        width: targetWidth,
        height: targetHeight,
        borderRadius: 0,
        duration: 0.75,
        ease: 'power3.out',
        onComplete: () => {
          setSelectedImageBlock(transitionImage);
          setTransitionImage(null);
        }
      }
    );

    return () => {
      animation.kill();
    };
  }, [transitionImage]);

  const handleImageSelect = (block: ContentBlock, sourceElement: HTMLDivElement) => {
    if (!block.src) return;
    const rect = sourceElement.getBoundingClientRect();
    setTransitionImage({
      ...block,
      startRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
  };

  const scrollBlocks = useMemo(() => {
    return blocks.filter(b => !b.isFixed);
  }, [blocks]);

  return (
    <div className="w-full">
      <div className="max-w-[1800px] mx-auto relative">
        {/* SCROLLING CONTENT */}
        <div className="relative z-10 px-4 md:px-12 pb-24 pt-16 md:pt-32">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-x-4 md:gap-x-8 gap-y-0 auto-rows-min">
            {scrollBlocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                onImageSelect={block.type === 'image' ? handleImageSelect : undefined}
              />
            ))}
          </div>
          
          <footer className="w-full py-12 border-t border-black/10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mt-32 bg-[#faf9f6]">
            <div className="flex flex-col gap-2">
              <span className="font-serif text-2xl"></span>
              <span className="text-sm uppercase tracking-widest opacity-50">Zongnan Bao</span>
            </div>

            <div className="flex gap-6 text-sm font-medium uppercase tracking-wide">
              <a href="https://www.instagram.com/zbao98/" className="hover:underline">Instagram</a>
              <a href="https://www.linkedin.com/in/zongnanbao/" className="hover:underline">LinkedIn</a>
              <a href="mailto:zongnan.bao@gmail.com" className="hover:underline">Email</a>
            </div>
          </footer>
        </div>
      </div>

      {selectedImageBlock?.src && (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 md:p-10"
          onClick={() => setSelectedImageBlock(null)}
          aria-label="Close enlarged photo"
        >
          <div
            className="max-h-[90vh] max-w-[92vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageBlock.src}
              alt={selectedImageBlock.alt || 'Selected portfolio work'}
              className="max-h-[78vh] w-auto max-w-[92vw] object-contain shadow-2xl"
            />
            {(selectedImageBlock.caption || selectedImageBlock.subCaption) && (
              <div className="mt-4 text-center text-white">
                {selectedImageBlock.caption && (
                  <p className="font-serif text-xl italic">{selectedImageBlock.caption}</p>
                )}
                {selectedImageBlock.subCaption && (
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/70">{selectedImageBlock.subCaption}</p>
                )}
              </div>
            )}
          </div>
        </button>
      )}

      {transitionImage?.src && (
        <div className="pointer-events-none fixed inset-0 z-[95] bg-black/70">
          <img
            ref={transitionImageRef}
            src={transitionImage.src}
            alt={transitionImage.alt || 'Selected portfolio work'}
            className="fixed object-cover shadow-2xl will-change-[top,left,width,height,border-radius]"
          />
        </div>
      )}
    </div>
  );
};
