// Rooted NYC — Landing Page (v2)
import { useState, useEffect, useRef, useCallback, type ReactElement } from "react";
import VizCards from "./imports/Viz";
import MainApp from "./imports/Main";

// ─── Theme ────────────────────────────────────────────────────────────────

const theme = {
  bg: "#14291E",
  text: "#F0E8D5",
  accent: "#C8A84B",
  accentText: "#C8A84B",
  muted: "rgba(240,232,213,0.45)",
  indicatorBg: "rgba(240,232,213,0.18)",
  indicatorActive: "#C8A84B",
  cardGreen: "#d8f6e7",
};

// ─── Cadastral map background ─────────────────────────────────────────────

interface Block {
  pts: [number, number][];
  dir: "h" | "v";
  lots: number;
  isGarden?: boolean;
}

function HatchedBlock({ pts, dir, lots, isGarden = false, opacity = 1 }:
  { pts: [number,number][]; dir:"h"|"v"; lots:number; isGarden?:boolean; opacity?:number; key?: number }) {
  const ptStr = pts.map(([x,y]) => `${x},${y}`).join(" ");
  const id = `clip-${pts[0][0]}-${pts[0][1]}`;
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const strokeColor = isGarden ? theme.cardGreen : theme.accent;
  const fillOp = isGarden ? 0.14 * opacity : 0.055 * opacity;
  const strokeOp = isGarden ? 0.6 * opacity : 0.22 * opacity;
  const hatchOp = isGarden ? 0.18 * opacity : 0.1 * opacity;
  const lines: ReactElement[] = [];
  if (dir === "v") {
    for (let i = 1; i < lots; i++) {
      const x = minX + (w * i) / lots;
      lines.push(<line key={i} x1={x} y1={minY} x2={x} y2={maxY}
        stroke={strokeColor} strokeWidth="0.5" opacity={hatchOp} clipPath={`url(#${id})`} />);
    }
  } else {
    for (let i = 1; i < lots; i++) {
      const y = minY + (h * i) / lots;
      lines.push(<line key={i} x1={minX} y1={y} x2={maxX} y2={y}
        stroke={strokeColor} strokeWidth="0.5" opacity={hatchOp} clipPath={`url(#${id})`} />);
    }
  }
  return (
    <g>
      <defs><clipPath id={id}><polygon points={ptStr} /></clipPath></defs>
      <polygon points={ptStr} fill={strokeColor} opacity={fillOp} />
      <polygon points={ptStr} fill="none" stroke={strokeColor}
        strokeWidth={isGarden ? "1.1" : "0.7"} opacity={strokeOp} />
      {lines}
    </g>
  );
}

const CADASTRAL_BLOCKS: Block[] = [
  { pts: [[60,60],[260,60],[260,170],[60,170]], dir:"v", lots:12 },
  { pts: [[280,55],[420,55],[420,175],[280,175]], dir:"v", lots:8 },
  { pts: [[440,58],[620,58],[620,180],[440,180]], dir:"v", lots:10 },
  { pts: [[640,52],[820,52],[820,172],[640,172]], dir:"v", lots:11 },
  { pts: [[840,60],[1000,60],[1000,168],[840,168]], dir:"v", lots:9 },
  { pts: [[58,200],[200,200],[200,340],[58,340]], dir:"v", lots:8 },
  { pts: [[220,198],[380,198],[380,345],[220,345]], dir:"v", lots:9 },
  { pts: [[400,195],[640,195],[640,350],[400,350]], dir:"v", lots:14 },
  { pts: [[500,210],[620,210],[620,335],[500,335]], dir:"h", lots:6 },
  { pts: [[660,202],[840,202],[840,348],[660,348]], dir:"v", lots:10 },
  { pts: [[860,200],[1010,200],[1010,350],[860,350]], dir:"v", lots:8 },
  { pts: [[55,368],[190,368],[190,500],[55,500]], dir:"v", lots:7 },
  { pts: [[210,372],[350,372],[350,505],[210,505]], dir:"v", lots:8 },
  { pts: [[372,370],[510,370],[510,502],[372,502]], dir:"h", lots:5 },
  { pts: [[530,368],[700,362],[700,498],[530,504]], dir:"v", lots:9 },
  { pts: [[720,370],[870,370],[870,500],[720,500]], dir:"v", lots:8 },
  { pts: [[892,366],[1012,366],[1012,504],[892,504]], dir:"v", lots:6 },
  { pts: [[60,524],[210,524],[210,660],[60,660]], dir:"v", lots:8 },
  { pts: [[232,520],[390,520],[390,658],[232,658]], dir:"v", lots:9 },
  { pts: [[412,522],[570,522],[570,660],[412,660]], dir:"v", lots:9 },
  { pts: [[592,518],[740,518],[740,658],[592,658]], dir:"v", lots:8 },
  { pts: [[762,524],[910,524],[910,660],[762,660]], dir:"v", lots:8 },
  { pts: [[932,520],[1060,520],[1060,660],[932,660]], dir:"v", lots:7 },
  { pts: [[155,200],[218,200],[218,340],[155,340]], dir:"h", lots:7 },
  { pts: [[842,368],[892,368],[892,504],[842,504]], dir:"h", lots:6 },
];

function CadastralBg() {
  return (
    <svg
      viewBox="0 0 1100 800"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: "rotate(-9deg) scale(1.18)", transformOrigin: "55% 45%" }}
    >
      {[192,380,520,690].map((y,i) => (
        <line key={`av${i}`} x1="0" y1={y} x2="1100" y2={y}
          stroke={theme.accent} strokeWidth="1.4" opacity="0.16" />
      ))}
      {[240,398,530,648,850].map((x,i) => (
        <line key={`st${i}`} x1={x} y1="0" x2={x} y2="800"
          stroke={theme.accent} strokeWidth="1.2" opacity="0.14" />
      ))}
      {[192,345,365,515,522,665,672].map((y,i) => (
        <line key={`cs${i}`} x1="0" y1={y} x2="1100" y2={y}
          stroke={theme.accent} strokeWidth="0.5" opacity="0.08" />
      ))}
      <line x1="200" y1="0" x2="750" y2="800" stroke={theme.accent} strokeWidth="2" opacity="0.12" />
      <line x1="820" y1="0" x2="1100" y2="480" stroke={theme.accent} strokeWidth="1.2" opacity="0.09" />
      {CADASTRAL_BLOCKS.map((b,i) => (
        <HatchedBlock key={i} {...b} opacity={0.85 + (i % 3) * 0.05} />
      ))}
    </svg>
  );
}

// ─── Slide 2 threat background — "Erasure" ───────────────────────────────

// "Erasure": blocks being crossed out and dissolved, some replaced by solid voids
function ThreatBg2() {
  const erased = [1, 2, 6, 7, 13, 14, 17, 18, 20];
  const voided = [3, 9, 11, 15, 21];
  return (
    <svg viewBox="0 0 1100 800" className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: "rotate(-9deg) scale(1.18)", transformOrigin: "55% 45%" }}>
      {[192,380,520,690].map((y,i) => (
        <line key={`av${i}`} x1="0" y1={y} x2="1100" y2={y}
          stroke={theme.accent} strokeWidth="1.4" opacity="0.13" />
      ))}
      {[240,398,530,648,850].map((x,i) => (
        <line key={`st${i}`} x1={x} y1="0" x2={x} y2="800"
          stroke={theme.accent} strokeWidth="1.0" opacity="0.11" />
      ))}
      <line x1="200" y1="0" x2="750" y2="800" stroke={theme.accent} strokeWidth="1.5" opacity="0.10" />
      {CADASTRAL_BLOCKS.map((b,i) => {
        const pts = b.pts.map(([x,y]) => `${x},${y}`).join(" ");
        const xs = b.pts.map(p=>p[0]), ys = b.pts.map(p=>p[1]);
        const x1=Math.min(...xs), y1=Math.min(...ys), x2=Math.max(...xs), y2=Math.max(...ys);
        if (voided.includes(i)) {
          // Solid dark void — the block has been "built over"
          return (
            <g key={i}>
              <polygon points={pts} fill={theme.accent} opacity="0.18" />
              <polygon points={pts} fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.35" />
              {/* dense hatching */}
              {Array.from({length:20},(_,j)=>(
                <line key={j} x1={x1} y1={y1+(y2-y1)*j/20} x2={x2} y2={y1+(y2-y1)*j/20}
                  stroke={theme.accent} strokeWidth="0.8" opacity="0.12" />
              ))}
            </g>
          );
        }
        if (erased.includes(i)) {
          // Ghost outline + X cross-out
          return (
            <g key={i}>
              <polygon points={pts} fill="none" stroke={theme.accent}
                strokeWidth="0.6" strokeDasharray="4 5" opacity="0.14" />
              <line x1={x1+4} y1={y1+4} x2={x2-4} y2={y2-4}
                stroke={theme.accent} strokeWidth="0.9" opacity="0.16" />
              <line x1={x2-4} y1={y1+4} x2={x1+4} y2={y2-4}
                stroke={theme.accent} strokeWidth="0.9" opacity="0.16" />
            </g>
          );
        }
        return <HatchedBlock key={i} {...b} opacity={0.75} />;
      })}
    </svg>
  );
}

// ─── Shared font size for body text across all slides ─────────────────────
const BODY_SIZE = "clamp(2rem, 3.8vw, 3.4rem)";
const SUB_SIZE  = "clamp(1rem, 1.6vw, 1.4rem)";

// ─── Slides ───────────────────────────────────────────────────────────────

function Slide1({ onSkip }: { onSkip?: () => void }) {
  return (
    <div className="w-full h-full flex flex-col justify-end px-16 pb-36 relative overflow-hidden">
      <CadastralBg />
      <button
        type="button"
        className="absolute top-8 right-8 z-20 font-medium"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.95rem",
          color: "#14291E",
          backgroundColor: "#F0E8D5",
          border: "1.5px solid #3f3f3f",
          borderRadius: "10px",
          padding: "10px 22px",
          cursor: "pointer",
          letterSpacing: "-0.02em",
          boxShadow: "4px 4px 0px #3f3f3f",
          transition: "transform 0.12s ease, box-shadow 0.12s ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translate(-2px,-2px)";
          e.currentTarget.style.boxShadow = "6px 6px 0px #3f3f3f";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "4px 4px 0px #3f3f3f";
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = "translate(2px,2px)";
          e.currentTarget.style.boxShadow = "2px 2px 0px #3f3f3f";
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = "translate(-2px,-2px)";
          e.currentTarget.style.boxShadow = "6px 6px 0px #3f3f3f";
        }}
        onClick={() => onSkip?.()}
      >
        Skip
      </button>
      <div className="relative z-10 max-w-4xl">
        <div className="text-xs font-bold tracking-[0.22em] mb-8 uppercase"
          style={{ color: theme.accentText, fontFamily: "Inter, sans-serif" }}>
          Rooted NYC
        </div>
        {/* Dominant headline */}
        <h1 className="font-black leading-[1.0]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: BODY_SIZE,
            color: theme.text, letterSpacing: "-0.03em" }}>
          NYC is home to{" "}
          <span style={{ color: theme.accentText }}>600+</span>
          {" "}community gardens.
        </h1>
        {/* Secondary copy — clearly smaller and muted */}
        <p className="font-medium leading-[1.5] mt-5"
          style={{ fontFamily: "Inter, sans-serif", fontSize: SUB_SIZE,
            color: theme.muted, maxWidth: "34rem" }}>
          They grow more than food — they create green space, community,
          and a living record of neighborhood history.
        </p>
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div className="w-full h-full flex flex-col justify-end px-16 pb-36 relative overflow-hidden">
      <ThreatBg2 />
      <div className="relative z-10 max-w-4xl">
        <p className="font-black leading-[1.03]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: BODY_SIZE,
            color: theme.text, letterSpacing: "-0.03em" }}>
          Yet for decades, gardens have been fighting to stay{" "}
          <span style={{ color: theme.accentText, textDecoration: "underline",
            textDecorationColor: `${theme.accent}55`, textUnderlineOffset: "6px" }}>
            rooted
          </span>
        </p>
        <p className="font-medium mt-5 leading-[1.5]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: SUB_SIZE,
            color: theme.muted, maxWidth: "34rem" }}>
          with hundreds of threats from development, displacement,
          and changing land priorities.
        </p>
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div className="w-full h-full grid" style={{ gridTemplateColumns: "45% 55%" }}>
      {/* Left: text — plain dark, no grid bg */}
      <div className="flex flex-col justify-center px-14 py-16">
        <p className="font-black leading-[1.03]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: BODY_SIZE,
            color: theme.text, letterSpacing: "-0.03em" }}>
          That&apos;s why we built{" "}
          <span style={{ color: theme.accentText }}>Rooted NYC:</span>
        </p>
        <p className="font-medium leading-[1.5] mt-5"
          style={{ fontFamily: "Inter, sans-serif", fontSize: SUB_SIZE,
            color: theme.muted, maxWidth: "28rem" }}>
          to make that resilience visible by measuring the conditions
          that help each garden endure.
        </p>
      </div>
      {/* Right: app screenshot — focused on the right half of the app */}
      <div className="relative flex items-center justify-center py-8 pr-10 overflow-hidden">
        <div className="relative w-full h-full rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(200,168,75,0.18), 0 24px 64px rgba(0,0,0,0.55)" }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-4 py-2.5"
            style={{ background: "#1e3828", borderBottom: "1px solid rgba(200,168,75,0.12)", flexShrink: 0 }}>
            {[1,2,3].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full"
                style={{ background: "rgba(240,232,213,0.15)" }} />
            ))}
            <div className="ml-3 px-3 py-0.5 rounded"
              style={{ background: "rgba(240,232,213,0.06)", color: "rgba(240,232,213,0.38)",
                fontFamily: "Inter, sans-serif", fontSize: "0.65rem" }}>
              rootednyc.tsingliu.info
            </div>
          </div>
          {/* App content — shifted left so the right side of the app is visible */}
          <div className="relative bg-white overflow-hidden" style={{ height: "calc(100% - 34px)" }}>
            <div style={{
              transform: "scale(0.5)",
              transformOrigin: "top right",
              width: "200%",
              height: "200%",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              right: 0,
            }}>
              <MainApp />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 4 illustrations — 4 style options ─────────────────────────────

type Concept = "root" | "growth" | "community" | "flourish";
const acc = "#C8A84B";


// Style B: Botanical Lines — delicate fine-line organic illustration
function BotanicalIllo({ concept }: { concept: Concept }) {
  if (concept === "root") return (
    <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
      <path d="M50 18 C50 18 50 45 50 52" stroke={acc} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M50 38 C44 30 36 28 30 32" stroke={acc} strokeWidth="1" strokeLinecap="round"/>
      <path d="M50 44 C56 36 64 34 70 38" stroke={acc} strokeWidth="1" strokeLinecap="round"/>
      <path d="M50 52 C45 60 38 68 30 72 C26 74 20 74 18 80" stroke={acc} strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M50 52 C50 62 50 75 50 88" stroke={acc} strokeWidth="1" strokeLinecap="round"/>
      <path d="M50 52 C55 60 62 68 70 72 C74 74 80 74 82 80" stroke={acc} strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M30 72 C26 78 22 82 18 88" stroke={acc} strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      <path d="M70 72 C74 78 78 82 82 88" stroke={acc} strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      <circle cx="50" cy="16" r="3" stroke={acc} strokeWidth="1" fill={`${acc}18`}/>
      <line x1="14" y1="52" x2="86" y2="52" stroke={acc} strokeWidth="0.7" opacity="0.25" strokeDasharray="3 3"/>
      {[22,36,50,64,78].map((x,i) => (
        <line key={i} x1={x} y1="50" x2={x} y2="54" stroke={acc} strokeWidth="0.7" opacity="0.3"/>
      ))}
    </svg>
  );
  if (concept === "growth") return (
    <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
      <path d="M50 88 C50 88 50 35 50 22" stroke={acc} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M50 22 L45 28 M50 22 L55 28" stroke={acc} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M50 50 C44 46 34 40 30 30 C38 28 50 38 50 50Z" stroke={acc} strokeWidth="0.9" fill={`${acc}14`}/>
      <path d="M50 50 C56 46 66 40 70 30 C62 28 50 38 50 50Z" stroke={acc} strokeWidth="0.9" fill={`${acc}10`}/>
      <path d="M50 64 C44 60 36 56 32 46 C40 44 50 54 50 64Z" stroke={acc} strokeWidth="0.9" fill={`${acc}10`}/>
      <path d="M50 64 C56 60 64 56 68 46 C60 44 50 54 50 64Z" stroke={acc} strokeWidth="0.9" fill={`${acc}0c`}/>
      <line x1="38" y1="32" x2="42" y2="36" stroke={acc} strokeWidth="0.7" opacity="0.4"/>
      <line x1="62" y1="32" x2="58" y2="36" stroke={acc} strokeWidth="0.7" opacity="0.4"/>
    </svg>
  );
  if (concept === "community") return (
    <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
      <path d="M50 20 C50 20 44 26 44 32 C44 38 50 40 50 40 C50 40 56 38 56 32 C56 26 50 20 50 20Z"
        stroke={acc} strokeWidth="1" fill={`${acc}14`}/>
      <path d="M50 40 C50 52 46 58 40 62 C36 64 30 64 28 70" stroke={acc} strokeWidth="1" strokeLinecap="round"/>
      <path d="M50 40 C50 52 54 58 60 62 C64 64 70 64 72 70" stroke={acc} strokeWidth="1" strokeLinecap="round"/>
      <circle cx="26" cy="74" r="7" stroke={acc} strokeWidth="1" fill={`${acc}12`}/>
      <circle cx="74" cy="74" r="7" stroke={acc} strokeWidth="1" fill={`${acc}12`}/>
      <circle cx="50" cy="80" r="7" stroke={acc} strokeWidth="1" fill={`${acc}10`}/>
      <path d="M50 40 C50 60 50 72 50 73" stroke={acc} strokeWidth="0.8" strokeLinecap="round"/>
      {/* small connecting arcs */}
      <path d="M33 74 C40 68 60 68 67 74" stroke={acc} strokeWidth="0.7" opacity="0.35" fill="none"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
      <circle cx="50" cy="50" r="12" stroke={acc} strokeWidth="1.2" fill={`${acc}1a`}/>
      {[0,51.4,102.8,154.2,205.6,257,308.4].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r1 = 18, r2 = 34;
        const x1 = 50 + r1*Math.cos(rad), y1 = 50 + r1*Math.sin(rad);
        const cx1 = 50 + r2*0.6*Math.cos(rad-0.6), cy1 = 50 + r2*0.6*Math.sin(rad-0.6);
        const x2 = 50 + r2*Math.cos(rad), y2 = 50 + r2*Math.sin(rad);
        return (
          <g key={i}>
            <path d={`M${x1} ${y1} Q${cx1} ${cy1} ${x2} ${y2}`} stroke={acc} strokeWidth="1" fill="none"/>
            <ellipse cx={x2} cy={y2} rx="5" ry="3.5"
              transform={`rotate(${deg}, ${x2}, ${y2})`}
              stroke={acc} strokeWidth="0.9" fill={`${acc}14`}/>
          </g>
        );
      })}
      {/* inner detail lines */}
      {[0,60,120,180,240,300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return <line key={i} x1={50+6*Math.cos(rad)} y1={50+6*Math.sin(rad)}
          x2={50+12*Math.cos(rad)} y2={50+12*Math.sin(rad)}
          stroke={acc} strokeWidth="0.7" opacity="0.4"/>;
      })}
    </svg>
  );
}

const DIMS: { concept: Concept; before: string; highlight: string; after: string }[] = [
  { concept: "root",      before: "",    highlight: "Secure land",           after: " allows the garden to take root." },
  { concept: "growth",    before: "",    highlight: "Supportive policies",   after: " help it grow." },
  { concept: "flourish",  before: "A ",  highlight: "development buffer",    after: " gives it room to thrive." },
  { concept: "community", before: "",    highlight: "Community stewardship", after: " keeps people invested in its future." },
];

function Slide4() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-10 py-8 relative overflow-hidden">
      <CadastralBg />
      {/* Eyebrow */}
      <div className="relative z-10 mb-6">
        <p className="text-xs font-bold tracking-[0.22em] uppercase"
          style={{ color: theme.accentText, fontFamily: "Inter, sans-serif" }}>
          The Four Dimensions
        </p>
      </div>
      {/* Horizontal 4-card row */}
      <div className="relative z-10 grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)", flex: 1, maxHeight: "72%" }}>
        {DIMS.map(({ concept, before, highlight, after }, i) => (
          <div key={i} className="flex flex-col" style={{
            background: "rgba(20,41,30,0.72)", backdropFilter: "blur(4px)",
            border: "1px solid rgba(200,168,75,0.18)",
            borderRadius: "10px", padding: "1.5rem 1.4rem 1.6rem",
          }}>
            {/* Botanical illustration */}
            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0, maxHeight: "55%" }}>
              <div style={{ width: "min(100%, 130px)", aspectRatio: "1" }}>
                <BotanicalIllo concept={concept} />
              </div>
            </div>
            {/* Text with highlighted phrase */}
            <p className="mt-4 font-medium leading-[1.45]"
              style={{ fontFamily: "Inter, sans-serif", fontSize: SUB_SIZE, color: theme.text }}>
              {before}
              <span style={{ color: theme.accentText, fontWeight: 700 }}>{highlight}</span>
              {after}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide5() {
  return (
    <div className="w-full h-full grid" style={{ gridTemplateColumns: "40% 60%" }}>
      <div className="flex flex-col justify-center px-14 py-16">
        <p className="font-black leading-[1.03]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: BODY_SIZE,
            color: theme.text, letterSpacing: "-0.03em" }}>
          Together, these dimensions shape a garden&apos;s{" "}
          <span style={{ color: theme.accentText }}>resilience.</span>
        </p>
      </div>
      <div className="flex items-center justify-center pr-10 py-10 overflow-hidden">
        <div style={{ transform: "scale(0.88)", transformOrigin: "center" }}>
          <VizCards />
        </div>
      </div>
    </div>
  );
}

function Slide6({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <div className="w-full h-full flex flex-col justify-end px-16 pb-36 relative overflow-hidden">
      <CadastralBg />
      <div className="relative z-10 max-w-2xl">
        <p className="font-black leading-[1.03]"
          style={{ fontFamily: "Inter, sans-serif", fontSize: BODY_SIZE,
            color: theme.text, letterSpacing: "-0.03em" }}>
          A score only matters if it leads to{" "}
          <span style={{ color: theme.accentText }}>action.</span>
        </p>
        <p className="font-medium leading-[1.5] mt-5"
          style={{ fontFamily: "Inter, sans-serif", fontSize: SUB_SIZE, color: theme.muted }}>
          Every one of us can help protect NYC&apos;s community gardens,
          and we&apos;ll show you where to start.
        </p>
        <button
          type="button"
          className="mt-10 font-medium"
          style={{
            fontFamily: "Inter, sans-serif", fontSize: "1.05rem",
            color: "#14291E", backgroundColor: "#F0E8D5",
            border: "1.5px solid #3f3f3f", borderRadius: "10px",
            padding: "14px 40px", cursor: "pointer", letterSpacing: "-0.02em",
            boxShadow: "4px 4px 0px #3f3f3f",
            transition: "transform 0.12s ease, box-shadow 0.12s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translate(-2px,-2px)";
            e.currentTarget.style.boxShadow = "6px 6px 0px #3f3f3f";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "4px 4px 0px #3f3f3f";
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = "translate(2px,2px)";
            e.currentTarget.style.boxShadow = "2px 2px 0px #3f3f3f";
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = "translate(-2px,-2px)";
            e.currentTarget.style.boxShadow = "6px 6px 0px #3f3f3f";
          }}
          onClick={() => onGetStarted?.()}
        >
          Let&apos;s get started!
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────

const TOTAL = 6;

export interface LandingPageProps {
  onGetStarted?: () => void;
  resetNonce?: number;
}

export default function App({ onGetStarted, resetNonce = 0 }: LandingPageProps) {
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const locked = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release the lock only after scroll events have been quiet for 1.2s.
  // Every new wheel event while locked resets the timer, so a long swipe
  // can't break through — the cooldown extends for as long as the gesture lasts.
  const scheduleLockRelease = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      locked.current = false;
    }, 800);
  }, []);

  const goTo = useCallback((next: number, dir: "down" | "up") => {
    if (locked.current || next < 0 || next >= TOTAL) return;
    locked.current = true;
    setDirection(dir);
    setVisible(false);
    setTimeout(() => {
      setSlide(next);
      setVisible(true);
    }, 320);
    scheduleLockRelease();
  }, [scheduleLockRelease]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked.current) {
        // Keep extending the quiet-period timer while the gesture is still running
        scheduleLockRelease();
        return;
      }
      if (e.deltaY > 0) goTo(slide + 1, "down");
      else if (e.deltaY < 0) goTo(slide - 1, "up");
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [slide, goTo, scheduleLockRelease]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") goTo(slide + 1, "down");
      if (e.key === "ArrowUp"   || e.key === "PageUp")   goTo(slide - 1, "up");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, goTo]);

  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0]?.clientY ?? startY;
      const delta = startY - endY;
      if (Math.abs(delta) < 50) return;
      if (delta > 0) goTo(slide + 1, "down");
      else goTo(slide - 1, "up");
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [slide, goTo]);

  useEffect(() => {
    setSlide(0);
    setVisible(true);
    setDirection("down");
    locked.current = false;
  }, [resetNonce]);

  const slides = [<Slide1 onSkip={onGetStarted} />, <Slide2 />, <Slide3 />, <Slide4 />, <Slide5 />, <Slide6 onGetStarted={onGetStarted} />];

  return (
    <div className="w-full h-dvh overflow-hidden relative"
      style={{ backgroundColor: theme.bg, fontFamily: "Inter, sans-serif", overscrollBehavior: "none" }}>

      {/* Slide content */}
      <div className="w-full h-full" style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : direction === "down" ? "translateY(-20px)" : "translateY(20px)",
        transition: visible
          ? "opacity 0.62s cubic-bezier(0.16,1,0.3,1), transform 0.62s cubic-bezier(0.16,1,0.3,1)"
          : "opacity 0.28s cubic-bezier(0.7,0,0.84,0), transform 0.28s cubic-bezier(0.7,0,0.84,0)",
      }}>
        {slides[slide]}
      </div>

      {/* Progress bar — right side only */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-50">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button key={i} onClick={() => goTo(i, i > slide ? "down" : "up")}
            style={{
              width: i === slide ? "6px" : "4px",
              height: i === slide ? "28px" : "12px",
              borderRadius: "3px",
              background: i === slide ? theme.indicatorActive : theme.indicatorBg,
              border: "none", cursor: "pointer", padding: 0,
              transition: "all 0.3s ease",
            }} />
        ))}
      </div>

      {/* Scroll hint — bottom right, slide 0 only */}
      {slide === 0 && (
        <div className="absolute bottom-8 right-20 flex flex-col items-center gap-2 z-50 pointer-events-none"
          style={{ opacity: 0.4 }}>
          <span className="text-xs tracking-[0.18em] uppercase"
            style={{ color: theme.text, fontFamily: "Inter, sans-serif" }}>
            Scroll
          </span>
          <div className="w-px h-8 overflow-hidden relative" style={{ background: theme.indicatorBg }}>
            <div className="absolute w-full" style={{
              height: "50%", background: theme.accent,
              animation: "scrollDot 1.6s ease-in-out infinite",
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes scrollDot {
          0%   { top: -50%; }
          100% { top: 150%; }
        }
      `}</style>
    </div>
  );
}
