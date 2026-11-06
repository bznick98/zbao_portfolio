export const COFFEE_TIME_ZONE = 'America/Los_Angeles';
export const cafes = [
  { id: 'saint-frank-sf', name: 'Saint Frank', area: 'San Francisco', neighborhood: 'Russian Hill', address: '2340 Polk Street, San Francisco, CA 94109', note: 'A little neighborhood ritual.', tag: 'Specialty coffee', x: 197, y: 157, url: 'https://www.saintfrankcoffee.com/pages/our-locations' },
  { id: 'timeless', name: 'Timeless Coffee', area: 'East Bay', neighborhood: 'Oakland · Piedmont Avenue', address: '4252 Piedmont Avenue, Oakland, CA 94611', note: 'Coffee, pastries, and a fresh perspective.', tag: 'Plant-based bakery', x: 354, y: 145, url: 'https://timelesscoffee.com/pages/locations' },
  { id: 'saint-frank-menlo', name: 'Saint Frank', area: 'Peninsula', neighborhood: 'Menlo Park', address: '1018 Alma Street, Menlo Park, CA 94025', note: 'A pause along the Peninsula.', tag: 'Near Caltrain', x: 315, y: 323, url: 'https://www.saintfrankcoffee.com/pages/our-locations' },
  { id: 'chromatic', name: 'Chromatic Coffee', area: 'South Bay', neighborhood: 'San Jose · Lincoln Avenue', address: '460 Lincoln Avenue, San Jose, CA', note: 'Big ideas, freshly roasted.', tag: 'Roastery café', x: 431, y: 405, url: 'https://www.chromaticcoffee.com/pages/visit' },
] as const;
export type Cafe = typeof cafes[number];
export type Slot = { start: string; end: string };
export function formatCoffeeDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone: COFFEE_TIME_ZONE, ...options }).format(new Date(date));
}
