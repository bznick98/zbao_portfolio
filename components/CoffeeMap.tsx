import React from 'react';
import { cafes } from '../data/coffee';

interface CoffeeMapProps {
  selected: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function CoffeeMap({ selected, onSelect, disabled = false }: CoffeeMapProps) {
  return (
    <figure className="coffee-map">
      <svg viewBox="65 65 445 380" role="group" aria-label="Bay Area coffee shops, approximate locations">
        <rect className="coffee-map-water" x="65" y="65" width="445" height="380"/>
        <path className="coffee-map-land" d="M0 0H180L172 35 203 63 224 77 210 101 180 115 182 138 203 157 215 184 220 215 239 251 264 274 277 298 317 330 343 360 382 387 424 400 470 441 500 470H0Z"/>
        <path className="coffee-map-land" d="M312 0H560V470H500L463 425 419 392 397 359 382 322 366 290 354 250 340 220 331 187 315 157 295 134 287 109 298 80 306 52Z"/>
        <path className="coffee-map-roads" d="M188 148Q213 219 271 291T429 405M350 145Q341 238 389 330T429 405M197 157L248 175 323 184" strokeWidth="2" fill="none"/>
        <g className="coffee-map-labels">
          <text x="75" y="192">San Francisco</text>
          <text x="375" y="148">Oakland</text>
          <text x="212" y="356">Menlo Park</text>
          <text x="420" y="436">San Jose</text>
        </g>
        <text className="coffee-map-bay" x="282" y="245" transform="rotate(58 282 245)">THE BAY</text>
        {cafes.map((c, i) => (
          <g key={c.id} className="coffee-map-pin" role="button" tabIndex={disabled ? -1 : 0}
            aria-label={`Select ${c.name}, ${c.neighborhood}`} aria-pressed={selected === c.id} aria-disabled={disabled}
            transform={`translate(${c.x} ${c.y})`}
            onClick={() => { if (!disabled) onSelect(c.id); }}
            onKeyDown={e => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(c.id);
              }
            }}>
            <circle r="19"/>
            <text textAnchor="middle" y="4">{i + 1}</text>
          </g>
        ))}
      </svg>
      <figcaption>Bay Area cafés · approximate locations</figcaption>
    </figure>
  );
}
