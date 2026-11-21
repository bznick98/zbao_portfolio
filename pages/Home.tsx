import { useState, type CSSProperties } from 'react';
import { PhotoViewer, type PhotoSelection } from '../components/PhotoViewer';
import { gallery, unsplashProfile } from '../data/gallery';

export function Home() {
  const [selection, setSelection] = useState<PhotoSelection | null>(null);

  return (
    <section className="home-gallery" aria-label="Photography by Zongnan Bao">
      <h1 className="gallery-wordmark" aria-label="Zongnan Bao"><span>zongnan</span><span>BAo</span></h1>
      <div className="photo-sequence">
        {gallery.map((photo, index) => (
          <figure className="gallery-print" key={photo.id} style={{ '--ratio': photo.width / photo.height } as CSSProperties}>
            <button className="photo-tile" type="button" aria-haspopup="dialog"
              aria-expanded={selection?.photo === photo} aria-label={`Enlarge ${photo.alt}`}
              onClick={event => setSelection({ photo, origin: event.currentTarget })}>
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height}
                loading={index < 2 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />
            </button>
            {photo.caption && <figcaption>
              <a href={`https://unsplash.com/photos/${photo.id}?utm_source=zbao_portfolio&utm_medium=referral`}>{photo.caption}</a>
            </figcaption>}
          </figure>
        ))}
      </div>
      <p className="gallery-more">More on <a href={unsplashProfile}>Unsplash</a></p>
      {selection && <PhotoViewer selection={selection} onClose={() => setSelection(null)} />}
    </section>
  );
}
