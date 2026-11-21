export interface GalleryPhoto {
  src: string;
  alt: string;
  caption?: string;
}

export const gallery: GalleryPhoto[] = [
  { src: '/gallery/mountains.webp', alt: 'A glacier winding between snow-covered peaks' },
  { src: '/gallery/getty.webp', alt: 'Afternoon light on the Getty Center’s limestone wall' },
  { src: '/gallery/menyuan.webp', alt: 'Yellow fields beneath a distant mountain range' },
  { src: '/gallery/cnf.webp', alt: 'Pink evening light touching a single mountain peak' },
  { src: '/gallery/sailimu.webp', alt: 'A turquoise lake following the curve of a barren shoreline' },
  { src: '/gallery/getty_1.webp', alt: 'A path through the Getty gardens overlooking the city' },
  { src: '/gallery/qkst-star.webp', alt: 'Star trails above a dark river valley' },
  { src: '/gallery/getty_3.webp', alt: 'Los Angeles at dusk beyond the Getty Center' },
  { src: '/gallery/meili.webp', alt: 'Sunlit golden peaks above a ridge in shadow' },
  { src: '/gallery/xiata.webp', alt: 'Snow-covered mountains at the head of a forested valley' },
];
