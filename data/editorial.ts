import type { ContentBlock } from '../types';

const WISDOM = [
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Nothing can bring you peace but yourself.', author: 'Ralph Waldo Emerson' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'To thine own self be true.', author: 'William Shakespeare' },
  { text: 'The soul is dyed by the thoughts.', author: 'Marcus Aurelius' },
];

const UNTITLED = ['A moment held in light', 'The quiet of looking', 'An ordinary kind of wonder'];

export const cleanEditorialText = (value: unknown, maxLength = 120) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';

export const fallbackTitles = (descriptions: string[]) => descriptions.map((description, index) => {
  const text = cleanEditorialText(description, 300).split(/[.!?](?:\s|$)/)[0];
  if (!text) return UNTITLED[index % UNTITLED.length];
  const words = text.split(' ');
  const title = words.slice(0, 14).join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1) + (words.length > 14 ? '…' : '');
});

export const formatPhotoCaption = (title: string, createdAt?: string) => {
  const date = createdAt ? new Date(createdAt) : null;
  return date && Number.isFinite(date.getTime()) ? `${title} (${date.getFullYear()})` : title;
};

export const withWisdom = (blocks: ContentBlock[], random = Math.random): ContentBlock[] => {
  const quotes = [...WISDOM];
  for (let index = quotes.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [quotes[index], quotes[swap]] = [quotes[swap], quotes[index]];
  }
  let quoteIndex = 0;
  return blocks.map(block => {
    if (block.type !== 'text') return block;
    const quote = quotes[quoteIndex++ % quotes.length];
    return { ...block, content: `“${quote.text}”`, caption: `— ${quote.author}` };
  });
};
