import React, { useRef } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { SocialLinks } from './SocialLinks';

interface MenuProps {
  isDarkMode: boolean;
}

export const Menu: React.FC<MenuProps> = ({ isDarkMode }) => {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full px-6 py-6 md:px-12 md:py-8 z-50 flex justify-between items-start pointer-events-none ${isDarkMode ? 'text-white' : 'mix-blend-difference text-white'}`}
        style={isDarkMode ? { color: '#f3f4ef' } : undefined}
      >
        <button
          onClick={() => dialog.current?.showModal()}
          aria-label="Open menu"
          className="pointer-events-auto group flex items-center gap-2 text-sm uppercase tracking-widest font-medium hover:opacity-70 transition-opacity"
        >
          <span className="hidden md:inline">Menu</span>
          <MenuIcon className="w-6 h-6 md:hidden" />
        </button>
      </nav>

      <dialog
        ref={dialog}
        aria-label="Portfolio menu"
        className="menu-overlay"
        style={isDarkMode ? { backgroundColor: '#f3f4ef', color: '#111111' } : { backgroundColor: '#111111', color: '#faf9f6' }}
      >
        <button
          onClick={() => dialog.current?.close()}
          aria-label="Close menu"
          className="absolute top-6 left-6 md:top-8 md:left-12 p-2 hover:opacity-70 transition-opacity"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="flex flex-col items-center gap-5 md:gap-7 text-center">
          {['Home', 'About', 'Blog', 'Poe', 'House'].map((item) => (
            <a
              href={`#${item.toLowerCase()}`}
              key={item}
              onClick={() => dialog.current?.close()}
              className="menu-item text-4xl md:text-7xl font-serif hover:text-yellow-500 transition-all duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        <SocialLinks />
      </dialog>
    </>
  );
};
