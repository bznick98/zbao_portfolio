import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import type { GalleryPhoto } from '../data/gallery';

export interface PhotoSelection {
  photo: GalleryPhoto;
  origin: HTMLButtonElement;
}

const easing = 'cubic-bezier(.22,.72,.2,1)';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Both rectangles contain the entire photograph, so a single scale keeps the frame intact.
function fitTo(rect: DOMRect, frame: DOMRect) {
  return `translate(${rect.left - frame.left}px, ${rect.top - frame.top}px) scale(${rect.width / frame.width})`;
}

export function PhotoViewer({ selection, onClose }: { selection: PhotoSelection; onClose: () => void }) {
  const { photo, origin } = selection;
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const modal = dialog.current!;
    const print = image.current!;
    const backdrop = shade.current!;
    if (!modal.open) modal.showModal();
    if (reducedMotion() || !print.animate) return;

    const start = fitTo(origin.getBoundingClientRect(), frame.current!.getBoundingClientRect());
    print.animate([{ transform: start }, { transform: 'none' }], { duration: 440, easing });
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing });
    return () => {
      for (const element of [print, backdrop]) element.getAnimations().forEach(animation => animation.cancel());
    };
  }, [origin]);

  function close() {
    const modal = dialog.current!;
    if (modal.dataset.closing || !modal.open) return;
    modal.dataset.closing = 'true';
    const print = image.current!;
    if (reducedMotion() || !print.animate) {
      modal.close();
      return;
    }

    // Read the live positions so Escape during opening or a viewport resize reverses smoothly.
    const bounds = frame.current!.getBoundingClientRect();
    const start = fitTo(print.getBoundingClientRect(), bounds);
    const end = fitTo(origin.getBoundingClientRect(), bounds);
    shade.current!.animate([{ opacity: getComputedStyle(shade.current!).opacity }, { opacity: 0 }],
      { duration: 280, easing, fill: 'forwards' });
    const move = print.animate([{ transform: start }, { transform: end }], { duration: 300, easing, fill: 'forwards' });
    move.onfinish = () => modal.close();
  }

  return (
    <dialog ref={dialog} className="photo-viewer" aria-label={photo.alt} onClose={onClose}
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={close}>
      <div className="viewer-shade" ref={shade} aria-hidden="true" />
      <figure style={{ '--photo-ratio': photo.width / photo.height, maxWidth: photo.width } as CSSProperties}>
        <div ref={frame}>
          <img ref={image} src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} />
        </div>
        {photo.caption && <figcaption>{photo.caption}</figcaption>}
      </figure>
      <button type="button" className="photo-close" aria-label="Close photograph" autoFocus><X /></button>
    </dialog>
  );
}
