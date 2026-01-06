import { ContentBlock } from '../types';

export const BLOCKS: ContentBlock[] = [
  // --- LAYER 0: FIXED HERO NAME ---
  {
    id: 'hero-zongnan',
    type: 'hero-text',
    content: 'ZONGNAN',
    isFixed: true,
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-4' },
    // "ZONGNAN" is longer than "WENDY", give it more space
    desktop: { colStart: 'col-start-1', colSpan: 'col-span-8', zIndex: 0 },
  },
  {
    id: 'hero-bao',
    type: 'hero-text',
    content: 'BAO',
    isFixed: true,
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-12', alignSelf: 'end' },
    // "BAO" is short, position it right
    desktop: { colStart: 'col-start-9', colSpan: 'col-span-4', justifySelf: 'end', marginTop: 'mt-24', zIndex: 0 },
  },

  // --- LAYER 1: SCROLLING CONTENT ---
  
  // Spacer to push content down initially so name is visible
  {
    id: 'spacer-top',
    type: 'spacer',
    mobile: { colSpan: 'col-span-12', marginBottom: 'h-[40vh]' },
    desktop: { colSpan: 'col-span-12', marginBottom: 'h-[30vh]' },
  },

  // --- ROW 1: Image (Right overlap) ---
  {
    id: 'img-1',
    type: 'image',
    src: 'https://picsum.photos/seed/bao1/600/800',
    alt: 'Portrait of a model',
    caption: 'The New Is Born Already Old, 2024',
    aspectRatio: 'aspect-[3/4]',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-12' },
    desktop: { colStart: 'col-start-8', colSpan: 'col-span-4', marginTop: '-mt-12', zIndex: 10 },
    parallaxSpeed: 0.1
  },

  // --- ROW 3: Large Serif Title (Left) ---
  {
    id: 'text-realm',
    type: 'text',
    content: 'In The Realm Of Ideas.',
    caption: 'Each Mind Is A World',
    mobile: { colSpan: 'col-span-10', marginBottom: 'mb-16' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-5', marginTop: 'mt-32', zIndex: 10 },
    parallaxSpeed: 0.05
  },

  // --- ROW 3: Image (Center/Right) ---
  {
    id: 'img-2',
    type: 'image',
    src: 'https://picsum.photos/seed/bao2/800/600',
    alt: 'Abstract landscape',
    caption: 'Smiles',
    subCaption: 'Politic is Love',
    aspectRatio: 'aspect-[4/3]',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-12' },
    desktop: { colStart: 'col-start-8', colSpan: 'col-span-4', marginTop: 'mt-12', zIndex: 10 },
    parallaxSpeed: 0.15
  },

  // --- ROW 4: Image (Far Left) ---
  {
    id: 'img-3',
    type: 'image',
    src: 'https://picsum.photos/seed/bao3/600/800',
    alt: 'Black and white jump',
    caption: 'But If You See, 2020',
    aspectRatio: 'aspect-[3/4]',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-8' },
    desktop: { colStart: 'col-start-1', colSpan: 'col-span-3', marginTop: 'mt-40', zIndex: 20 },
    parallaxSpeed: 0.2
  },

  // --- ROW 4: Centered Text ---
  {
    id: 'text-olha',
    type: 'text',
    content: 'Olha.',
    caption: 'Look closely',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-12', justifySelf: 'center' },
    desktop: { colStart: 'col-start-5', colSpan: 'col-span-4', justifySelf: 'center', marginTop: 'mt-64', zIndex: 10 },
    parallaxSpeed: 0.05
  },

  // --- ROW 5: Large Vertical Image (Right) ---
  {
    id: 'img-4',
    type: 'image',
    src: 'https://picsum.photos/seed/bao4/500/900',
    alt: 'Abstract color field',
    caption: 'When I had nothing, I wanted.',
    aspectRatio: 'aspect-[9/16]',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-16' },
    desktop: { colStart: 'col-start-9', colSpan: 'col-span-3', marginTop: 'mt-20', zIndex: 10 },
    parallaxSpeed: 0.25
  },

  // --- ROW 6: Big Text (Bottom Left) ---
  {
    id: 'text-just-in-time',
    type: 'text',
    content: 'Just In Time.',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-8' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-4', marginTop: 'mt-32', zIndex: 10 },
    parallaxSpeed: 0.05
  },
  
   // --- ROW 6: Landscape Image ---
  {
    id: 'img-5',
    type: 'image',
    src: 'https://picsum.photos/seed/bao5/900/500',
    alt: 'Horizon line',
    caption: 'Everything I know about love, I invented.',
    aspectRatio: 'aspect-[16/9]',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-24' },
    desktop: { colStart: 'col-start-6', colSpan: 'col-span-6', marginTop: 'mt-48', zIndex: 10 },
    parallaxSpeed: 0.1
  },
  
  // --- ROW 7: Footer-ish Text ---
  {
    id: 'text-compassion',
    type: 'hero-text',
    content: 'Compassion',
    mobile: { colSpan: 'col-span-12' },
    desktop: { colStart: 'col-start-4', colSpan: 'col-span-9', marginTop: 'mt-40', zIndex: 10 },
    parallaxSpeed: 0
  },
    {
    id: 'text-outweighed',
    type: 'hero-text',
    content: 'Outweighed',
    mobile: { colSpan: 'col-span-12', marginBottom: 'mb-32' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-10', marginTop: '-mt-4', zIndex: 10 },
    parallaxSpeed: 0
  },
];