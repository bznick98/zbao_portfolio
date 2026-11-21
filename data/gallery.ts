export const unsplashProfile = 'https://unsplash.com/@zbao';

export interface GalleryPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

declare const __PUBLISHED_GALLERY__: GalleryPhoto[];
export const gallery = __PUBLISHED_GALLERY__;
