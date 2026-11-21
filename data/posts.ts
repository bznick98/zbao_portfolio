export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  published: string;
  summary: string;
  cover: { src: string; alt: string; width: number; height: number };
  reviewers?: string;
  links: { label: string; href: string }[];
}

export const posts: BlogPost[] = [
  {
    slug: 'bilateral-neural-operators',
    title: 'Learning sequential image enhancement in bilateral space',
    category: 'UCLA capstone',
    published: '2023-06-07',
    summary: 'How a small preview can guide a sequence of edits on a 12-megapixel photograph.',
    cover: { src: '/blog/bilateral-output.webp', width: 730, height: 482, alt: 'A person with an umbrella walks down a rainy street after the exposure adjustment.' },
    reviewers: 'Achuta Kadambi, Bolei Zhou and Aditya Grover',
    links: [
      { label: 'Capstone paper (PDF)', href: '/blog/capstone-zongnan-bao.pdf' },
      { label: 'Code on GitHub', href: 'https://github.com/bznick98/bilateral-image-enhance' },
    ],
  },
  {
    slug: 'focus-stacking',
    title: 'Focus stacking with Laplacian pyramids',
    category: 'Computational photography',
    published: '2023-02-06',
    summary: 'Combining the sharp parts of several macro photographs to bring a fly’s eyes and bristles into focus at once.',
    cover: { src: '/blog/focus-output.webp', width: 325, height: 217, alt: 'A focus-stacked macro photograph resolves the facets of a fly’s eyes.' },
    links: [{ label: 'Code on GitHub', href: 'https://github.com/bznick98/Focus_Stacking' }],
  },
];
