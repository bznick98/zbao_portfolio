import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Menu } from './components/Menu';
import { BlockRenderer } from './components/BlockRenderer';
import { BLOCKS } from './data/content';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Blog } from './pages/Blog';
import { posts } from './data/posts';
import { SocialLinks } from './components/SocialLinks';
import './portfolio.css';
import { Eye } from './components/Eye';
import { Poe } from './pages/Poe';
const House = lazy(() => import('./pages/House').then(module => ({ default: module.House })));

const App: React.FC = () => {
  const [hash, setHash] = useState(() => window.location.hash);
  const post = posts.find(entry => hash === `#blog/${entry.slug}`);
  const pages: Record<string, string> = {
    '#about': 'About', '#profile': 'About', '#contact': 'About',
    '#blog': 'Blog', '#poe': 'Poe', '#house': 'House',
  };
  const currentPage = hash.startsWith('#blog/') ? 'Blog' : (pages[hash] ?? 'Home');

  useEffect(() => {
    const change = () => setHash(window.location.hash);
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${post?.title ?? currentPage} — Zongnan Bao`;
  }, [hash, post, currentPage]);
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
      case 'Home': return <Home />;
      case 'About': return <About />;
      case 'Blog': return <Blog post={post} />;
      case 'Poe': return <Poe />;
      case 'House': return <Suspense fallback={null}><House isDarkMode={isDarkMode} /></Suspense>;
      default: return <Home />;
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
        {currentPage !== 'House' && <Menu isDarkMode={isDarkMode} />}

        {currentPage !== 'House' && <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
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
        </div>}

        {isEyeEnabled && currentPage !== 'House' && (
          <div className="pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2">
            <Eye className="h-28 w-28 md:h-36 md:w-36" />
          </div>
        )}

        {currentPage === 'Home' && (
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
        {currentPage !== 'House' && (
          <footer className="portfolio-footer">
            <a href="#home">Zongnan Bao</a>
            <SocialLinks />
          </footer>
        )}
      </div>

      {isThemeTransitioning && currentPage !== 'House' && <div className="theme-transition-flash" aria-hidden="true" />}
    </div>
  );
};

export default App;
