export interface GalleryPhoto {
  src: string;
  width: number;
  height: number;
  title: string;
  alt: string;
}

export const gallery: GalleryPhoto[] = [
  { src: '/gallery/mountains.webp', width: 1500, height: 972, title: 'Glacier valley', alt: 'A glacier winding between snow-covered peaks' },
  { src: '/gallery/getty.webp', width: 1300, height: 1300, title: 'Afternoon at the Getty', alt: 'Afternoon light on the Getty Center’s limestone wall' },
  { src: '/gallery/cnf.webp', width: 934, height: 1400, title: 'Alpenglow', alt: 'Pink evening light touching a single mountain peak' },
  { src: '/gallery/menyuan.webp', width: 1500, height: 1000, title: 'Menyuan', alt: 'Yellow fields beneath a distant mountain range' },
  { src: '/gallery/getty_1.webp', width: 1050, height: 1400, title: 'The Getty gardens', alt: 'A path through the Getty gardens overlooking the city' },
  { src: '/gallery/sailimu.webp', width: 1500, height: 999, title: 'Sailimu Lake', alt: 'A turquoise lake following the curve of a barren shoreline' },
  { src: '/gallery/getty_3.webp', width: 1050, height: 1400, title: 'Los Angeles at dusk', alt: 'Los Angeles at dusk beyond the Getty Center' },
  { src: '/gallery/qkst-star.webp', width: 1500, height: 1000, title: 'Star trails', alt: 'Star trails above a dark river valley' },
  { src: '/gallery/meili.webp', width: 1500, height: 1000, title: 'Meili Snow Mountains', alt: 'Sunlit golden peaks above a ridge in shadow' },
  { src: '/gallery/xiata.webp', width: 1500, height: 1000, title: 'Xiata Valley', alt: 'Snow-covered mountains at the head of a forested valley' },
];
