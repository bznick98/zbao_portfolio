import React from 'react';
import { cafes } from '../data/coffee';

export function CoffeeMap({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return <div className="coffee-map">
    <div className="map-heading"><span>A LITTLE GUIDE TO THE BAY</span><span>37.8° N / 122.4° W</span></div>
    <svg viewBox="0 0 560 470" role="group" aria-label="Illustrated Bay Area café map, approximate locations">
      <defs><pattern id="map-lines" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#b8c8bd" strokeWidth=".5" opacity=".32"/></pattern></defs>
      <rect width="560" height="470" fill="#dce5df"/><rect width="560" height="470" fill="url(#map-lines)"/>
      <path d="M0 0H180L172 35 203 63 224 77 210 101 180 115 182 138 203 157 215 184 220 215 239 251 264 274 277 298 317 330 343 360 382 387 424 400 470 441 500 470H0Z" fill="#f1efe4" stroke="#bbc3b5"/>
      <path d="M312 0H560V470H500L463 425 419 392 397 359 382 322 366 290 354 250 340 220 331 187 315 157 295 134 287 109 298 80 306 52Z" fill="#f1efe4" stroke="#bbc3b5"/>
      <path d="M60 0L117 80 122 140 153 220 176 281 237 362 266 470M440 0L426 73 446 140 423 212 461 295 470 371" stroke="#d9decd" strokeWidth="40" opacity=".7" fill="none"/>
      <path d="M188 148Q213 219 271 291T429 405M350 145Q341 238 389 330T429 405M197 157L248 175 323 184" stroke="#d3b89d" strokeWidth="3" fill="none"/>
      <path d="M188 148Q213 219 271 291T429 405M350 145Q341 238 389 330T429 405" stroke="#fffdf7" strokeWidth="1" fill="none"/>
      <path d="M179 119L197 86M205 158L316 156" stroke="#c19a7d" strokeWidth="2" strokeDasharray="4 4"/>
      <g fill="#707d74" fontFamily="Arial, sans-serif" fontSize="10" letterSpacing="2"><text x="80" y="70">MARIN</text><text x="374" y="85">EAST BAY</text><text x="111" y="300" transform="rotate(38 111 300)">PENINSULA</text><text x="382" y="449">SOUTH BAY</text></g>
      <g fill="#7c9389" fontFamily="Georgia, serif" fontStyle="italic" fontSize="19"><text x="254" y="234" transform="rotate(42 254 234)">San Francisco Bay</text><text x="32" y="337" transform="rotate(-62 32 337)">Pacific Ocean</text></g>
      <g fill="#575e55" fontFamily="Arial, sans-serif" fontSize="10"><text x="102" y="185">San Francisco</text><text x="373" y="167">Oakland</text><text x="240" y="351">Menlo Park</text><text x="445" y="395">San Jose</text></g>
      {cafes.map((c, i) => <g key={c.id} role="button" tabIndex={0} aria-label={`Select ${c.name}, ${c.neighborhood}`} aria-pressed={selected === c.id} onClick={() => onSelect(c.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id); } }} className="map-pin" transform={`translate(${c.x} ${c.y})`}>
        {selected === c.id && <circle r="24" fill="#ad563d" opacity=".13"/>}<circle r="15" fill={selected === c.id ? '#a34e37' : '#fffdf6'} stroke={selected === c.id ? '#a34e37' : '#a9ad9c'} strokeWidth="1.5"/><text textAnchor="middle" y="4" fontSize="11" fontFamily="Arial" fill={selected === c.id ? '#fffdf6' : '#545d4b'}>{String(i + 1).padStart(2, '0')}</text>
      </g>)}
      <g transform="translate(510 38)" fill="#647264"><text y="-10" textAnchor="middle" fontFamily="Arial" fontSize="10">N</text><path d="M0 0L-5 19 0 15 5 19Z"/></g>
    </svg>
    <div className="map-caption"><span><i/> Good coffee. Better company.</span><span>Illustrated map · not for navigation</span></div>
  </div>;
}
