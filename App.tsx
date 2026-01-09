import React, { useMemo, useState } from 'react';
import { Menu } from './components/Menu';
import { BlockRenderer } from './components/BlockRenderer';
import { BLOCKS } from './data/content';
import { Work } from './pages/Work';
import { Profile } from './pages/Profile';
import { Contact } from './pages/Contact';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Work');
  const heroBlocks = useMemo(() => BLOCKS.filter(block => block.isFixed), []);

  const renderPage = () => {
    switch (currentPage) {
      case 'Work': return <Work />;
      case 'Profile': return <Profile />;
      case 'Contact': return <Contact />;
      default: return <Work />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#faf9f6] text-[#111] overflow-x-hidden selection:bg-black selection:text-white">
      <Menu onNavigate={setCurrentPage} />

      {currentPage === 'Work' && (
        <div className="fixed inset-0 w-full h-full pointer-events-none z-40 px-4 md:px-12 pt-24 md:pt-32 mix-blend-difference text-white">
          <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 w-full h-full">
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
  );
};

export default App;
