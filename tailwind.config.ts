import type { Config } from 'tailwindcss';
import { BLOCKS } from './data/content';
import { getGridClasses } from './data/layout';

export default {
  content: [
    './index.html',
    './{App,index}.tsx',
    './{components,pages,data}/**/*.{ts,tsx}',
  ],
  // Layout variants are assembled at runtime from the portfolio content.
  safelist: BLOCKS.flatMap(block =>
    getGridClasses(block.mobile, block.desktop).trim().split(/\s+/)
  ),
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Rubik Spray Paint"', '"Yuji Boku"', 'serif'],
        serif: ['"Rubik Spray Paint"', '"Yuji Boku"', 'serif'],
        mono: ['"Rubik Spray Paint"', '"Yuji Boku"', 'serif'],
        cormorant: ['"Cormorant Upright"', 'serif'],
        rubik: ['"Rubik"', 'sans-serif'],
        majorMono: ['"Major Mono Display"', 'monospace'],
      },
      colors: {
        black: '#111111',
        white: '#ffffff',
        offwhite: '#faf9f6',
      },
      screens: {
        xs: '400px',
      },
    },
  },
} satisfies Config;
