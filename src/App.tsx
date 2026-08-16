import React, { useState } from 'react';
import { GardenDataExplorer } from './components/GardenDataExplorer';
import { PublicActionCenter } from './components/PublicActionCenter';
import { CrowdsourceTester } from './components/CrowdsourceTester';
import { LearnTab } from './components/LearnTab';
import LandingPage from '../nyc-rooted-landing/src/App.tsx';

type Tab = 'landing' | 'explorer' | 'actions' | 'crowdsource' | 'learn';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [landingKey, setLandingKey] = useState(0);
  const [openGardenId, setOpenGardenId] = useState<string | null>(null);
  const [learnReturn, setLearnReturn] = useState<{ sectionId: string; label: string } | null>(null);

  const navItem = (id: Tab, label: string) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => {
          if (id === 'learn') setLearnReturn(null);
          if (id === 'explorer') setOpenGardenId(null);
          if (id === 'landing') setLandingKey((key) => key + 1);
          setActiveTab(id);
        }}
        className={`px-4 py-2 rounded-[15px] text-[18px] md:text-[20px] tracking-[-0.05em] whitespace-nowrap transition-colors ${
          active ? 'bg-[#306a4e] text-[#f3f3f3] shadow-[4px_4px_0_0_#3f3f3f]' : 'text-[#3f3f3f]'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`min-h-screen text-[#3f3f3f] font-[Inter,sans-serif] antialiased ${
        activeTab === 'landing' ? 'bg-[#14291E]' : 'bg-[#fbf7ff]'
      }`}
    >
      {activeTab === 'landing' ? (
        <LandingPage
          resetNonce={landingKey}
          onGetStarted={() => setActiveTab('explorer')}
        />
      ) : activeTab === 'explorer' ? (
        <GardenDataExplorer
          openGardenId={openGardenId}
          onOpenReport={() => setActiveTab('crowdsource')}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-32">
          {activeTab === 'learn' && (
            <LearnTab
              focusSectionId={learnReturn?.sectionId}
              onOpenGarden={(gardenId, sectionId, sectionLabel) => {
                setLearnReturn({ sectionId, label: sectionLabel });
                setOpenGardenId(gardenId);
                setActiveTab('explorer');
              }}
            />
          )}
          {activeTab === 'actions' && <PublicActionCenter />}
          {activeTab === 'crowdsource' && <CrowdsourceTester />}
        </main>
      )}

      {activeTab !== 'landing' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] flex items-center gap-8 md:gap-12 px-2 py-1 font-[Inter,sans-serif]">
          {navItem('explorer', 'Explore')}
          {navItem('learn', 'Learn')}
          {navItem('actions', 'Act')}
          {navItem('landing', 'About')}
        </nav>
      )}
    </div>
  );
}
