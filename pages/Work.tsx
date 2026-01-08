import React, { useLayoutEffect, useMemo, useState, useEffect } from 'react';
import { BLOCKS } from '../data/content';
import { BlockRenderer } from '../components/BlockRenderer';
import { ContentBlock } from '../types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GoogleGenAI, Type } from "@google/genai";

gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURATION ---

// 1. ENVIRONMENT VARIABLES
// Create a .env file in your root directory to store these keys securely.
// Example:
// VITE_UNSPLASH_ACCESS_KEY=your_key_here

const UNSPLASH_ACCESS_KEY = (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY || ''; 
const UNSPLASH_USERNAME = 'nick19981122';

// 2. GENAI CONFIG
// API Key is obtained from process.env.API_KEY

// 3. BACKUP TITLES
// Used if API fails, keys are missing, or generation takes too long.
const BACKUP_TITLES = [
  "The Silence of Objects",
  "Echoes in the Void",
  "Ephemeral Geometry",
  "Light Betrays Shadow",
  "A Memory of Blue",
  "Static Motion",
  "The Architecture of Time",
  "Fragments of Reality",
  "Soft Bruise of Night",
  "Concrete Whispers"
];

export const Work: React.FC = () => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(BLOCKS);

  // Unsplash Fetch & GenAI Generation Logic
  useEffect(() => {
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn('Unsplash Integration: No Access Key found in environment variables (VITE_UNSPLASH_ACCESS_KEY). Using placeholder content.');
      return;
    }

    const initContent = async () => {
      try {
        // Identify how many image blocks we need to fill
        const imageBlockCount = BLOCKS.filter(b => b.type === 'image').length;

        // --- STEP 1: Fetch photos from Unsplash ---
        // Use /photos/random endpoint to ensure true randomness across the entire portfolio
        const response = await fetch(
          `https://api.unsplash.com/photos/random?username=${UNSPLASH_USERNAME}&count=${imageBlockCount}&client_id=${UNSPLASH_ACCESS_KEY}`
        );
        
        if (!response.ok) throw new Error('Unsplash API request failed');
        
        let data = await response.json();
        
        // Normalize data
        const selectedPhotos = Array.isArray(data) ? data : [data];
        
        if (selectedPhotos.length > 0) {

          // --- STEP 2: Generate Poetic Captions using Gemini ---
          let generatedCaptions: string[] = [];
          
          if (process.env.API_KEY) {
             try {
                 // Prepare context for the model
                 const descriptions = selectedPhotos.map((p: any, i: number) => ({
                    index: i,
                    desc: p.description || p.alt_description || "Abstract artistic composition"
                 }));

                 const prompt = `
                    I have ${descriptions.length} art photography descriptions:
                    ${JSON.stringify(descriptions)}

                    Task: Write a short, poetic, avant-garde, abstract caption (max 6 words) for each.
                    Style: Editorial, poetic
                 `;

                 // Call GenAI API
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const result = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                 });

                 const content = result.text;
                 
                 if (content) {
                    generatedCaptions = JSON.parse(content);
                 }
             } catch (e) {
                 console.error("GenAI generation failed:", e);
             }
          }

          // --- STEP 3: Update State ---
          setBlocks(prevBlocks => {
             let imgIndex = 0;
             return prevBlocks.map(block => {
                 if (block.type === 'image' && imgIndex < selectedPhotos.length) {
                   const photo = selectedPhotos[imgIndex];
                   
                   let finalCaption = generatedCaptions[imgIndex];
                   
                   if (!finalCaption) {
                       finalCaption = BACKUP_TITLES[Math.floor(Math.random() * BACKUP_TITLES.length)];
                   }

                   // Extract Year
                   const year = photo.created_at ? new Date(photo.created_at).getFullYear() : new Date().getFullYear();
                   
                   // Extract Dimensions for Aspect Ratio
                   const width = photo.width;
                   const height = photo.height;

                   imgIndex++;
                   
                   return {
                     ...block,
                     src: photo.urls.regular,
                     alt: photo.alt_description || 'Portfolio Work',
                     caption: `${finalCaption} (${year})`,
                     // This CSS value overrides the default tailwind aspect ratio class
                     customAspectRatio: `${width} / ${height}`
                   };
                 }
                 return block;
             });
          });
        }
      } catch (error) {
        console.error('Failed to fetch/process content:', error);
      }
    };

    initContent();
  }, []); // Run once on mount (refresh)

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // Refresh ScrollTrigger after a slight delay to ensure DOM is ready and images might be loading
    const timer = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => clearTimeout(timer);
  }, [blocks]);

  const { fixedBlocks, scrollBlocks } = useMemo(() => {
    return {
      fixedBlocks: blocks.filter(b => b.isFixed),
      scrollBlocks: blocks.filter(b => !b.isFixed)
    };
  }, [blocks]);

  return (
    <div className="w-full">
      <div className="max-w-[1800px] mx-auto relative">
        {/* LAYER 0: FIXED HERO CONTENT */}
        <div className="fixed inset-0 w-full h-full pointer-events-none z-50 px-4 md:px-12 pt-24 md:pt-32">
            <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 w-full h-full">
              {fixedBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
        </div>

        {/* LAYER 1: SCROLLING CONTENT */}
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