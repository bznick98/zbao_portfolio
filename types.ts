export type BlockType = 'hero-text' | 'image' | 'text' | 'spacer';

export interface GridPosition {
  colStart?: string;
  colSpan?: string;
  rowStart?: string;
  rowSpan?: string;
  alignSelf?: 'start' | 'center' | 'end';
  justifySelf?: 'start' | 'center' | 'end';
  zIndex?: number;
  marginTop?: string; // For offset adjustments
  marginBottom?: string;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content?: string;
  src?: string;
  alt?: string;
  caption?: string;
  subCaption?: string;
  aspectRatio?: string; // Tailwind class e.g., 'aspect-[3/4]'
  customAspectRatio?: string; // CSS value e.g., '3456 / 5184'
  
  // Layout behavior
  isFixed?: boolean; // If true, stays in place while other content scrolls

  // Responsive layout configuration
  mobile: GridPosition;
  tablet?: GridPosition;
  desktop: GridPosition;
  
  // Animation config
  parallaxSpeed?: number;
}