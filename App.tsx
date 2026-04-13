import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Menu } from './components/Menu';
import { BlockRenderer } from './components/BlockRenderer';
import { BLOCKS } from './data/content';
import { Work } from './pages/Work';
import { Profile } from './pages/Profile';
import { Contact } from './pages/Contact';
import { Eye } from './components/Eye';
import { Poe } from './pages/Poe';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Work');
  const [isEyeEnabled, setIsEyeEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const heroBlocks = useMemo(() => BLOCKS.filter(block => block.isFixed), []);

  useEffect(() => {
    const bgColor = isDarkMode ? '#101112' : '#faf9f6';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  const renderPage = () => {
    switch (currentPage) {
      case 'Work': return <Work />;
      case 'Profile': return <Profile />;
      case 'Contact': return <Contact />;
      case 'Poe': return <Poe />;
      default: return <Work />;
    }
  };

  const handleThemeToggle = () => {
    setIsThemeTransitioning(true);
    setIsDarkMode(prev => !prev);
    window.setTimeout(() => setIsThemeTransitioning(false), 620);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden selection:bg-black selection:text-white">
      <style>{`
        .app-theme {
          background-color: #faf9f6;
          color: #111111;
          transition: background-color 520ms cubic-bezier(0.22, 1, 0.36, 1), color 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-theme[data-theme='dark'] {
          background-color: #101112;
          color: #f3f4ef;
        }

        .app-theme[data-theme='dark'] .bg-\\[\\#faf9f6\\] { background-color: #101112 !important; }
        .app-theme[data-theme='dark'] .text-\\[\\#111\\] { color: #f3f4ef !important; }
        .app-theme[data-theme='dark'] .text-black { color: #f3f4ef !important; }
        .app-theme[data-theme='dark'] .border-black { border-color: rgba(243, 244, 239, 0.78) !important; }
        .app-theme[data-theme='dark'] .border-black\\/10 { border-color: rgba(243, 244, 239, 0.2) !important; }
        .app-theme[data-theme='dark'] .border-black\\/20 { border-color: rgba(243, 244, 239, 0.3) !important; }
        .app-theme[data-theme='dark'] .border-black\\/60 { border-color: rgba(243, 244, 239, 0.6) !important; }
        .app-theme[data-theme='dark'] .bg-white { background-color: #1a1b1e !important; }
        .app-theme[data-theme='dark'] .bg-white\\/90 { background-color: rgba(26, 27, 30, 0.9) !important; }
        .app-theme[data-theme='dark'] .hover\\:bg-black:hover { background-color: #f3f4ef !important; }
        .app-theme[data-theme='dark'] .hover\\:text-white:hover { color: #101112 !important; }

        .theme-transition-flash {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 55;
          background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.08) 38%, rgba(255, 255, 255, 0) 70%);
          animation: themeRipple 620ms ease forwards;
        }

        @keyframes themeRipple {
          from { opacity: 0; transform: scale(0.92); }
          30% { opacity: 1; }
          to { opacity: 0; transform: scale(1.1); }
        }
      `}</style>

      <div className="app-theme min-h-screen" data-theme={isDarkMode ? 'dark' : 'light'}>
        <Menu onNavigate={setCurrentPage} isDarkMode={isDarkMode} />

        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="rounded-full border border-black/60 bg-white/90 p-2 text-black shadow-sm transition hover:bg-black hover:text-white"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            aria-pressed={isDarkMode}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsEyeEnabled(prev => !prev)}
            className="rounded-full border border-black/60 bg-white/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-black shadow-sm transition hover:bg-black hover:text-white"
            aria-pressed={isEyeEnabled}
          >
            Eye: {isEyeEnabled ? 'on' : 'off'}
          </button>
        </div>

        {isEyeEnabled && (
          <div className="pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2">
            <Eye className="h-28 w-28 md:h-36 md:w-36" />
          </div>
        )}

        {currentPage === 'Work' && (
          <div className="fixed inset-0 w-full h-full pointer-events-none z-40 px-4 md:px-12 mix-blend-difference text-white">
            <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 w-full h-full content-center">
              {heroBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          </div>
        )}

        <main className="w-full">
          {renderPage()}
        </main>
      </div>

      {isThemeTransitioning && <div className="theme-transition-flash" aria-hidden="true" />}
    </div>
  );
};

export default App;
