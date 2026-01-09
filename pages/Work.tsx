import React, { useLayoutEffect, useMemo, useState, useEffect } from 'react';
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
// VITE_OPENAI_API_KEY=your_key_here

const UNSPLASH_ACCESS_KEYS = [
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_1,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_2,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_3,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_4,
  (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY_5
].filter(Boolean) as string[];
const UNSPLASH_USERNAME = 'nick19981122';

// 2. OPENAI CONFIG
// API Key is obtained from VITE_OPENAI_API_KEY
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';

export const Work: React.FC = () => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(BLOCKS);

  // Unsplash Fetch & GenAI Generation Logic
  useEffect(() => {
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

                  // Extract Dimensions for Aspect Ratio
                  const width = photo.width;
                  const height = photo.height;

                  imgIndex++;

                  const captionValue = finalCaption ? `${finalCaption} (${year})` : undefined;

                  return {
                    ...block,
                    src: photo.urls.regular,
                    alt: photo.alt_description || 'Portfolio Work',
                    caption: captionValue,
                    // This CSS value overrides the default tailwind aspect ratio class
                    customAspectRatio: `${width} / ${height}`
                  };
                }
                return block;
              });
            });
          };

          // --- STEP 2: Update UI immediately with images (no titles yet) ---
          applyPhotoUpdates();

          // --- STEP 3: Generate Poetic Captions using OpenAI in the background ---
          if (OPENAI_API_KEY) {
            const generateCaptions = async () => {
              try {
                // Prepare context for the model
                const descriptions = selectedPhotos.map((p: any, i: number) => ({
                  index: i,
                  desc: p.description || p.alt_description || "Abstract artistic composition"
                }));

                const systemPrompt = 'You create concise, poetic, avant-garde photo titles.';
                const userPrompt = `
                  Generate ${descriptions.length} short poetic titles (max 6 words each).
                  Make them elegant, creative, and slightly varied in tone.
                  Return JSON with shape: {"titles":["...","..."]} in the same order as this list.
                  Descriptions: ${JSON.stringify(descriptions)}
                `;

                // Call OpenAI API (fast, high-quality model)
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 120,
                    temperature: 0.85,
                    top_p: 0.95
                  })
                });

                if (!response.ok) {
                  throw new Error('OpenAI API request failed');
                }

                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content?.trim();

                if (content) {
                  const parsed = JSON.parse(content);
                  const generatedCaptions = Array.isArray(parsed?.titles) ? parsed.titles : [];
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

  const scrollBlocks = useMemo(() => {
    return blocks.filter(b => !b.isFixed);
  }, [blocks]);

  return (
    <div className="w-full">
      <div className="max-w-[1800px] mx-auto relative">
        {/* SCROLLING CONTENT */}
        <div className="relative z-10 px-4 md:px-12 pb-24 pt-24 md:pt-32">
          <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 gap-y-0 auto-rows-min">
            {scrollBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
          
          <footer className="w-full py-12 border-t border-black/10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mt-32 bg-[#faf9f6]">
            <div className="flex flex-col gap-2">
              <span className="font-serif italic text-2xl">Zongnan Bao</span>
              <span className="text-sm uppercase tracking-widest opacity-50">welcome</span>
            </div>

            <div className="flex gap-6 text-sm font-medium uppercase tracking-wide">
              <a href="https://www.instagram.com/zbao98/" className="hover:underline">Instagram</a>
              <a href="https://www.linkedin.com/in/zongnanbao/" className="hover:underline">LinkedIn</a>
              <a href="mailto:zongnan.bao@gmail.com" className="hover:underline">Email</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
