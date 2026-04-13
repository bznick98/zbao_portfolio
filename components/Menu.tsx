import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import gsap from 'gsap';

interface MenuProps {
  onNavigate: (page: string) => void;
  isDarkMode: boolean;
}

export const Menu: React.FC<MenuProps> = ({ onNavigate, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      gsap.to('.menu-overlay', {
        y: '0%',
        duration: 0.6,
        ease: 'power3.out'
      });
      gsap.fromTo('.menu-item',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0, delay: 0.05 }
      );
    } else {
      gsap.to('.menu-overlay', {
        y: '-100%',
        duration: 0.6,
        ease: 'power3.inOut'
      });
    }
  }, [isOpen]);

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full px-6 py-6 md:px-12 md:py-8 z-50 flex justify-between items-start pointer-events-none ${isDarkMode ? 'text-[#f3f4ef]' : 'mix-blend-difference text-white'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto group flex items-center gap-2 text-sm uppercase tracking-widest font-medium hover:opacity-70 transition-opacity"
        >
          <span className="hidden md:inline">Menu</span>
          <MenuIcon className="w-6 h-6 md:hidden" />
        </button>
      </nav>

      <div className={`menu-overlay fixed inset-0 z-[60] transform -translate-y-full flex flex-col justify-center items-center ${isDarkMode ? 'bg-[#f3f4ef] text-[#111]' : 'bg-[#111] text-[#faf9f6]'}`}>
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 left-6 md:top-8 md:left-12 p-2 hover:opacity-70 transition-opacity"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="flex flex-col items-center gap-8 md:gap-12 text-center">
          {['Work', 'Profile', 'Contact', 'Poe'].map((item) => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className="menu-item text-5xl md:text-8xl font-serif hover:text-yellow-500 transition-all duration-300"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="menu-item absolute bottom-12 text-sm uppercase tracking-widest opacity-50">
          © 2026 Zongnan Bao
        </div>
      </div>
    </>
  );
};
