import React, { useState } from 'react';
import { Menu } from './components/Menu';
import { Work } from './pages/Work';
import { Profile } from './pages/Profile';
import { Contact } from './pages/Contact';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Work');

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
      
      <main className="w-full">
         {renderPage()}
      </main>
    </div>
  );
};

export default App;