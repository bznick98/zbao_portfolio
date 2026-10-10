import type { GridPosition } from '../types';

export const getGridClasses = (mobile: GridPosition, desktop: GridPosition) => {
  const m = mobile;
  const d = desktop;

  let classes = 'relative w-full ';

  if (m.colSpan) classes += `${m.colSpan} `;
  if (m.marginTop) classes += `${m.marginTop} `;
  if (m.marginBottom) classes += `${m.marginBottom} `;
  if (m.alignSelf) classes += `self-${m.alignSelf} `;
  if (m.justifySelf) classes += `justify-self-${m.justifySelf} `;

  if (d.colStart) classes += `md:${d.colStart} `;
  if (d.colSpan) classes += `md:${d.colSpan} `;
  if (d.rowStart) classes += `md:${d.rowStart} `;
  if (d.marginTop) classes += `md:${d.marginTop} `;
  if (d.marginBottom) classes += `md:${d.marginBottom} `;
  if (d.alignSelf) classes += `md:self-${d.alignSelf} `;
  if (d.justifySelf) classes += `md:justify-self-${d.justifySelf} `;

  classes += d.zIndex !== undefined ? `z-[${d.zIndex}] ` : 'z-10 ';
  return classes;
};
