import { ContentBlock } from '../types';

export const BLOCKS: ContentBlock[] = [
  // --- LAYER 0: FIXED HERO NAME ---
  {
    id: 'hero-zongnan',
    type: 'hero-text',
    content: 'zongnan',
    isFixed: true,
    mobile: { colSpan: 'col-span-6', marginBottom: 'mb-2', justifySelf: 'center' },
    desktop: { colStart: 'col-start-1', colSpan: 'col-span-6', zIndex: 0, justifySelf: 'center', marginTop: 'mt-8' },
  },
  {
    id: 'hero-bao',
    type: 'hero-text',
    content: 'BAo',
    isFixed: true,
    mobile: { colSpan: 'col-span-6', marginBottom: 'mb-6', justifySelf: 'end' },
    desktop: { colStart: 'col-start-7', colSpan: 'col-span-6', justifySelf: 'center', marginTop: 'mt-8', zIndex: 0 },
  },

  // --- LAYER 1: SCROLLING CONTENT ---
  
  // Spacer to push content down initially so name is visible
  {
    id: 'spacer-top',
    type: 'spacer',
    mobile: { colSpan: 'col-span-2', marginBottom: 'h-[24vh]' },
    desktop: { colSpan: 'col-span-12', marginBottom: 'h-[30vh]' },
  },

  // --- Denser Layout: Added more image blocks interspersed ---

  // Image A (New - Left Top) -> Increased size
  {
    id: 'img-extra-1',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-2', marginBottom: 'mb-8' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-5', marginTop: '-mt-24', zIndex: 20 },
    parallaxSpeed: 0.15
  },

  // Image 1 (Existing - Right Top) -> Increased size
  {
    id: 'img-1',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-8', marginBottom: 'mb-12', justifySelf: 'end' },
    desktop: { colStart: 'col-start-7', colSpan: 'col-span-6', marginTop: '-mt-12', zIndex: 10 },
    parallaxSpeed: 0.1
  },

  // Text 1
  {
    id: 'text-realm',
    type: 'text',
    content: 'In The Realm Of Ideas.',
    caption: 'Each Mind Is A World',
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-4', marginBottom: 'mb-8' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-5', marginTop: 'mt-56', zIndex: 10 },
    parallaxSpeed: 0.05
  },

  // Image B (New - Right, slightly below text) -> Increased size
  {
    id: 'img-extra-2',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-6', marginBottom: 'mb-10', justifySelf: 'end' },
    desktop: { colStart: 'col-start-8', colSpan: 'col-span-4', marginTop: 'mt-20', zIndex: 5 },
    parallaxSpeed: 0.08
  },

  // Image 2 (Existing - Center Right) -> Increased size
  {
    id: 'img-2',
    type: 'image',
    aspectRatio: 'aspect-[4/3]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-2', marginBottom: 'mb-12' },
    desktop: { colStart: 'col-start-4', colSpan: 'col-span-8', marginTop: 'mt-28', zIndex: 10 },
    parallaxSpeed: 0.15
  },

  // Image C (New - Left, small) -> Increased size
  {
    id: 'img-extra-3',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-4', marginBottom: 'mb-8' },
    desktop: { colStart: 'col-start-1', colSpan: 'col-span-3', marginTop: 'mt-16', zIndex: 20 },
    parallaxSpeed: 0.2
  },

  // Image 3 (Existing - Far Left) -> Increased size
  {
    id: 'img-3',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-10', marginBottom: 'mb-10', justifySelf: 'end' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-5', marginTop: 'mt-24', zIndex: 20 },
    parallaxSpeed: 0.2
  },

  // Text 2 (Centered)
  {
    id: 'text-olha',
    type: 'text',
    content: 'Olha.',
    caption: 'Look closely',
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-6', marginBottom: 'mb-10', justifySelf: 'center' },
    desktop: { colStart: 'col-start-5', colSpan: 'col-span-4', justifySelf: 'center', marginTop: 'mt-48', zIndex: 10 },
    parallaxSpeed: 0.05
  },

  // Image D (New - Right/Center strip) -> Increased size
  {
    id: 'img-extra-4',
    type: 'image',
    aspectRatio: 'aspect-[3/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-2', marginBottom: 'mb-10' },
    desktop: { colStart: 'col-start-9', colSpan: 'col-span-3', marginTop: '-mt-40', zIndex: 5 },
    parallaxSpeed: 0.12
  },

  // Image 4 (Existing - Large Vertical Right) -> Increased size
  {
    id: 'img-4',
    type: 'image',
    aspectRatio: 'aspect-[2/3]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-8', marginBottom: 'mb-14', justifySelf: 'end' },
    desktop: { colStart: 'col-start-7', colSpan: 'col-span-6', marginTop: 'mt-36', zIndex: 10 },
    parallaxSpeed: 0.25
  },

  // Image E (New - Center/Left density) -> Increased size
  {
    id: 'img-extra-5',
    type: 'image',
    aspectRatio: 'aspect-[16/11]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-4', marginBottom: 'mb-10', justifySelf: 'end' },
    desktop: { colStart: 'col-start-1', colSpan: 'col-span-7', marginTop: 'mt-16', zIndex: 15 },
    parallaxSpeed: 0.1
  },

  // Text 3
  {
    id: 'text-just-in-time',
    type: 'text',
    content: 'Just In Time.',
    mobile: { colSpan: 'col-span-1', marginTop: '-mt-2', marginBottom: 'mb-12', justifySelf: 'end' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-4', marginTop: 'mt-32', zIndex: 10 },
    parallaxSpeed: 0.05
  },
  
  // Image 5 (Existing - Landscape) -> Increased size
  {
    id: 'img-5',
    type: 'image',
    aspectRatio: 'aspect-[5/4]',
    useNaturalAspectRatio: true,
    mobile: { colSpan: 'col-span-1', marginTop: 'mt-6', marginBottom: 'mb-20' },
    desktop: { colStart: 'col-start-2', colSpan: 'col-span-11', marginTop: 'mt-28', zIndex: 10 },
    parallaxSpeed: 0.1
  },
  
  // Footer Text
  // {
  //   id: 'text-1',
  //   type: 'hero-text',
  //   content: 'Compassion',
  //   mobile: { colSpan: 'col-span-12' },
  //   desktop: { colStart: 'col-start-4', colSpan: 'col-span-9', marginTop: 'mt-40', zIndex: 10 },
  //   parallaxSpeed: 0
  // },
  // {
  //   id: 'text-2',
  //   type: 'hero-text',
  //   content: '',
  //   mobile: { colSpan: 'col-span-12', marginBottom: 'mb-32' },
  //   desktop: { colStart: 'col-start-2', colSpan: 'col-span-10', marginTop: '-mt-4', zIndex: 10 },
  //   parallaxSpeed: 0
  // },
];
