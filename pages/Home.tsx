import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { gallery, type GalleryPhoto } from '../data/gallery';

const keys = ['', '_1', '_2', '_3', '_4', '_5']
  .map(suffix => import.meta.env['VITE_UNSPLASH_ACCESS_KEY' + suffix])
  .filter(Boolean);

interface UnsplashPhoto {
  urls?: { regular?: string };
  alt_description?: string;
  description?: string;
  created_at?: string;
}

async function loadSelection(signal: AbortSignal): Promise<GalleryPhoto[]> {
  for (const key of keys) {
    const url = new URL('https://api.unsplash.com/photos/random');
    url.search = new URLSearchParams({ username: 'zbao', count: String(gallery.length), client_id: key }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) continue;
    const data = await response.json();
    const photos: UnsplashPhoto[] = Array.isArray(data) ? data : [data];
    const selection: GalleryPhoto[] = [];
    for (const photo of photos) {
      const src = photo?.urls?.regular;
      if (typeof src === 'string' && src) selection.push({
        src,
        alt: photo.alt_description || photo.description || 'Photograph by Zongnan Bao',
        caption: photo.created_at?.slice(0, 4),
      });
    }
    if (selection.length) return selection.slice(0, gallery.length);
  }
  return [];
}

export function Home() {
  const [photos, setPhotos] = useState(gallery);
  const [selected, setSelected] = useState<GalleryPhoto>();
  const viewer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!keys.length) return;
    const controller = new AbortController();
    const { signal } = controller;
    async function refresh() {
      const selection = await loadSelection(signal);
      if (!selection.length || signal.aborted) return;
      setPhotos([...selection, ...gallery.slice(selection.length)]);
      const response = await fetch('/api/generate-captions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ descriptions: selection.map(photo => photo.alt) }),
      });
      if (!response.ok) return;
      const { titles } = await response.json();
      if (!Array.isArray(titles) || signal.aborted) return;
      setPhotos(current => current.map((photo, i) => {
        if (photo.src !== selection[i]?.src || typeof titles[i] !== 'string' || !titles[i]) return photo;
        const year = selection[i].caption;
        return { ...photo, caption: year ? `${titles[i]} (${year})` : titles[i] };
      }));
    }
    // The local collection is already visible if either optional service is unavailable.
    void refresh().catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <section className="home-gallery" aria-label="Photography by Zongnan Bao">
      <div className="gallery-wordmark" aria-hidden="true"><span>Zongnan</span><span>Bao</span></div>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <button key={gallery[i].src} className="photo-tile"
            style={photo.src !== gallery[i].src ? { backgroundImage: `url("${gallery[i].src}")` } : undefined}
            aria-label={`Enlarge photograph: ${photo.alt}`}
            onClick={() => { setSelected(photo); viewer.current?.showModal(); }}>
            <img src={photo.src} alt={photo.alt} width="900" height="600"
              loading={i < 2 ? 'eager' : 'lazy'}
              onError={() => {
                if (photo.src === gallery[i].src) return;
                setPhotos(current => current.map((p, index) => index === i ? gallery[i] : p));
                setSelected(current => current?.src === photo.src ? gallery[i] : current);
              }} />
          </button>
        ))}
      </div>
      <dialog ref={viewer} className="photo-viewer" aria-label="Full-size photograph"
        onClose={() => setSelected(undefined)}
        onClick={event => { if (event.target === viewer.current) viewer.current.close(); }}>
        {selected && <figure>
          <img src={selected.src} alt={selected.alt} />
          {selected.caption && <figcaption>{selected.caption}</figcaption>}
        </figure>}
        <button className="photo-close" aria-label="Close photograph" onClick={() => viewer.current?.close()}><X /></button>
      </dialog>
    </section>
  );
}
