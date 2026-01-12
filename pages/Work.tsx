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
  const hasInitializedRef = useRef(false);
  const captionsRequestedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollVelocityRef = useRef(0);

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

          // --- STEP 3: Generate Poetic Captions using OpenAI in the background ---
          if (OPENAI_API_KEY && !captionsRequestedRef.current) {
            captionsRequestedRef.current = true;
            const generateCaptions = async () => {
              try {
                // Prepare context for the model
                const descriptions = selectedPhotos.map((p: any, i: number) => ({
                  index: i,
                  desc: p.description || p.alt_description || "Poetic image description"
                }));

                const prompt = `
You are a poet.
Generate ${descriptions.length} short abstract, poetic titles (max 6 words each).
Make them elegant, creative, and with a focus on the main image subject.
Return JSON with shape: {"titles":["...","..."]} in the same order as this list.
Descriptions: ${JSON.stringify(descriptions)}
                `.trim();

                // Call OpenAI API (fast, lightweight model)
                const response = await fetch('https://api.openai.com/v1/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: 'gpt-3.5-turbo-instruct',
                    prompt,
                    max_tokens: 160,
                    temperature: 0.85,
                    top_p: 0.95
                  })
                });

                if (!response.ok) {
                  throw new Error('OpenAI API request failed');
                }

                const data = await response.json();
                const content = data?.choices?.[0]?.text?.trim();

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let time = 0;

    const cursor = {
      x: 0,
      y: 0,
      active: false
    };

    type Particle = {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      radius: number;
      phase: number;
      amplitude: number;
    };

    let particles: Particle[] = [];

    const buildParticles = () => {
      const density = 0.00008;
      const count = Math.min(220, Math.max(120, Math.floor(width * height * density)));
      particles = Array.from({ length: count }, () => {
        const baseX = Math.random() * width;
        const baseY = Math.random() * height;
        return {
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          radius: Math.random() * 2 + 0.6,
          phase: Math.random() * Math.PI * 2,
          amplitude: Math.random() * 16 + 6
        };
      });
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      cursor.x = width / 2;
      cursor.y = height / 2;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildParticles();
    };

    const handlePointerMove = (event: PointerEvent) => {
      cursor.x = event.clientX;
      cursor.y = event.clientY;
      cursor.active = true;
    };

    const handlePointerLeave = () => {
      cursor.active = false;
    };

    handleResize();

    const scrollTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollVelocityRef.current = gsap.utils.clamp(-2000, 2000, self.getVelocity());
      }
    });

    const animate = () => {
      time += 0.01;
      context.clearRect(0, 0, width, height);

      const scrollWave = scrollVelocityRef.current * 0.0005;

      particles.forEach((particle) => {
        const dx = cursor.x - particle.x;
        const dy = cursor.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const influence = cursor.active ? Math.max(0, 140 - distance) / 140 : 0;
        const pushX = (dx / distance) * influence * 24;
        const pushY = (dy / distance) * influence * 24;

        const waveX = Math.cos(time + particle.phase) * particle.amplitude;
        const waveY = Math.sin(time + particle.phase) * (particle.amplitude + scrollWave * 18);

        particle.x = particle.baseX + waveX + pushX;
        particle.y = particle.baseY + waveY + pushY + scrollWave * 40;

        context.beginPath();
        context.fillStyle = 'rgba(16, 24, 40, 0.22)';
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      scrollTrigger.kill();
    };
  }, []);

  const scrollBlocks = useMemo(() => {
    return blocks.filter(b => !b.isFixed);
  }, [blocks]);

  return (
    <div className="w-full relative">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#faf9f6] via-[#faf9f6]/90 to-[#faf9f6]" />
      <div className="max-w-[1800px] mx-auto relative z-10">
        {/* SCROLLING CONTENT */}
        <div className="relative z-10 px-4 md:px-12 pb-24 pt-16 md:pt-32">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-x-4 md:gap-x-8 gap-y-0 auto-rows-min">
            {scrollBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
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
    </div>
  );
};
