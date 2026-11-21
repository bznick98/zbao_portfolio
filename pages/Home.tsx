import { useState } from 'react';
import { PhotoViewer, type PhotoSelection } from '../components/PhotoViewer';
import { gallery } from '../data/gallery';

export function Home() {
  const [selection, setSelection] = useState<PhotoSelection | null>(null);

  return (
    <section className="home-gallery" aria-label="Photography by Zongnan Bao">
      <header className="gallery-masthead">
        <h1>Zongnan Bao</h1>
        <p>Photographs</p>
      </header>
      <div className="photo-sequence">
        {gallery.map((photo, index) => (
          <figure className="gallery-print" key={photo.src}>
            <button className="photo-tile" type="button" aria-haspopup="dialog"
              aria-expanded={selection?.photo === photo} aria-label={`Enlarge ${photo.title}`}
              onClick={event => setSelection({ photo, origin: event.currentTarget })}>
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height}
                loading={index < 2 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />
            </button>
            <figcaption>{photo.title}</figcaption>
          </figure>
        ))}
      </div>
      {selection && <PhotoViewer selection={selection} onClose={() => setSelection(null)} />}
    </section>
  );
}
