import React, { useEffect, useState } from "react";
import { GardenDataExplorer } from "./components/GardenDataExplorer";
import LandingPage from "../nyc-rooted-landing/src/App.tsx";

type Tab = "landing" | "explorer" | "actions" | "learn";

const DEV_ONLY = new Set<Tab>(["learn", "actions"]);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("landing");
  const [landingKey, setLandingKey] = useState(0);
  const [openGardenId, setOpenGardenId] = useState<string | null>(null);
  const [hoveredDev, setHoveredDev] = useState<Tab | null>(null);
  const [devNoticeOpen, setDevNoticeOpen] = useState(false);

  useEffect(() => {
    if (!devNoticeOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDevNoticeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [devNoticeOpen]);

  const navItem = (id: Tab, label: string, edge: "first" | "middle" | "last") => {
    const active = activeTab === id;
    const locked = DEV_ONLY.has(id);
    const radius =
      edge === "first"
        ? "rounded-l-[13px]"
        : edge === "last"
          ? "rounded-r-[13px]"
          : "";
    return (
      <span
        className="relative flex items-stretch"
        onMouseEnter={() => locked && setHoveredDev(id)}
        onMouseLeave={() => setHoveredDev(null)}
      >
        <button
          type="button"
          onClick={() => {
            if (locked) {
              setDevNoticeOpen(true);
              return;
            }
            if (id === "explorer") setOpenGardenId(null);
            if (id === "landing") setLandingKey((key) => key + 1);
            setActiveTab(id);
          }}
          className={`px-2.5 sm:px-3.5 py-1.5 font-medium text-[14px] sm:text-[16px] md:text-[18px] tracking-[-0.05em] whitespace-nowrap transition-colors duration-[120ms] ${radius} ${
            active
              ? "bg-[#306a4e] text-[#f3f3f3]"
              : "text-[#3f3f3f] hover:bg-[#ede8f7] active:bg-[#d8f6e7]"
          }`}
        >
          {label}
        </button>
        {hoveredDev === id && (
          <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[15px] border-2 border-[#3f3f3f] bg-[#fbf7ff] px-3 py-1.5 font-medium text-[14px] tracking-[-0.03em] text-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f]">
            Developer view only
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      className={`min-h-screen text-[#3f3f3f] font-[Inter,sans-serif] antialiased ${
        activeTab === "landing" ? "bg-[#f4fff4]" : "bg-[#fbf7ff]"
      }`}
    >
      {activeTab === "landing" ? (
        <LandingPage
          resetNonce={landingKey}
          onGetStarted={() => setActiveTab("explorer")}
        />
      ) : (
        <GardenDataExplorer openGardenId={openGardenId} />
      )}

      {activeTab !== "landing" && (
        <nav className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[2000] bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] flex items-stretch font-[Inter,sans-serif] max-w-[calc(100vw-16px)]">
          {navItem("explorer", "Explore", "first")}
          {navItem("learn", "Learn", "middle")}
          {navItem("actions", "Act", "middle")}
          {navItem("landing", "About", "last")}
        </nav>
      )}

      {devNoticeOpen && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center px-4 bg-[#3f3f3f]/40"
          onClick={() => setDevNoticeOpen(false)}
        >
          <div
            className="w-full max-w-[360px] bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[20px] shadow-[6px_6px_0_0_#3f3f3f] overflow-hidden font-[Inter,sans-serif]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-view-title"
          >
            <div className="bg-[#306a4e] px-5 py-3">
              <h2
                id="dev-view-title"
                className="font-medium text-[#fbf7ff] text-[18px] tracking-[-0.05em]"
              >
                Developer view only
              </h2>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              <p className="font-normal text-[16px] tracking-[-0.03em] text-[#3f3f3f] text-center">
                Learn and Act are not part of the public app yet.
              </p>
              <button
                type="button"
                onClick={() => setDevNoticeOpen(false)}
                className="nb-press min-w-[120px] px-5 py-2 bg-[#306a4e] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] font-medium text-[#fbf7ff] text-[16px] tracking-[-0.03em]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
