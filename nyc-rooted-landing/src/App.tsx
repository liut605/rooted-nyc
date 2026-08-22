import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

export interface LandingPageProps {
  onGetStarted?: () => void;
  resetNonce?: number;
}

const MINT = "#f4fff4";
const GREEN = "#306a4e";

const MAP_DELAYS = [180, 620] as const;
const ACTION_DELAYS = [120, 560, 1040] as const;

const PRELOAD = [
  "/landing/art-garden.png",
  "/landing/art-garden-people.png",
  "/landing/art-skyline.png",
  "/landing/art-buildings.png",
  "/landing/art-buildings-more.png",
  "/landing/art-buildings-tall.png",
  "/landing/map-mockup.png",
  "/landing/layer-1-soil.png",
  "/landing/layer-2-water.png",
  "/landing/layer-3-community.png",
  "/landing/layer-4-sun.png",
  "/landing/ellipse-mint.svg",
];

const H1 = "clamp(2.05rem, 5.1vw, 4.35rem)";
const H2 = "clamp(1.05rem, 2.15vw, 1.9rem)";

const STORY_VH = 1400;

const T = {
  people: 0.05,
  threat: 0.12,
  stripPlanters: 0.18,
  stripGround: 0.21,
  shadow: 0.22,
  more: 0.30,
  tall: 0.37,
  zoom: 0.44,
  map: 0.54,
  layers: 0.62,
  hands: 0.72,
  action: 0.91,
};

function clamp(n: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, n));
}

function span(p: number, a: number, b: number) {
  if (b <= a) return p >= a ? 1 : 0;
  return clamp((p - a) / (b - a));
}

function fade(p: number, inA: number, inB: number, outA: number, outB: number) {
  if (p < inA) return 0;
  if (p < inB) return span(p, inA, inB);
  if (p < outA) return 1;
  return 1 - span(p, outA, outB);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const FW = 1728;
const FH = 1117;
const PEACH_ART = { w: 1265, h: 743 };
const ALIGN_DX = FW - PEACH_ART.w - 308;
const SHADOW_NUDGE = 12;
const SHADOW_MORE = { src: "/landing/art-buildings-more.png", x: 134 + ALIGN_DX + SHADOW_NUDGE, y: 374, w: 304, h: 743 };
const SHADOW_TALL = { src: "/landing/art-buildings-tall.png", x: 493 + ALIGN_DX + SHADOW_NUDGE, y: 108, w: 434, h: 1009 };
const SHADOW_INK = "#414141";
const TALL_ZOOM = { x: 0.68, y: 0.32 };
const HEADLINE_Y = 169;
const SUB_Y = 434;
const GROUND_H = 149;
const HANDS_BOX = { x: 662, y: 131, w: 1369, h: 1290 };
const ELLIPSE = { w: 1562, h: 1070 };
const TOGETHER_S = 0.6;
const TOGETHER_ARRIVE_T = 0.34;
const TOGETHER_ISO_GONE_T = 0.44;
const TOGETHER_HOLD_T = 0.64;
const ELLIPSE_KF = [
  { t: 0, s: 2.05 },
  { t: TOGETHER_ARRIVE_T, s: TOGETHER_S },
  { t: TOGETHER_HOLD_T, s: TOGETHER_S },
  { t: 0.74, s: 0.52 },
  { t: 0.88, s: 0.26 },
  { t: 1, s: 0.08 },
] as const;

function ellipseAt(t: number) {
  const k = ELLIPSE_KF;
  let s: number;
  if (t <= 0) s = k[0].s;
  else if (t >= 1) s = k[k.length - 1].s;
  else {
    let i = 0;
    while (i < k.length - 1 && t > k[i + 1].t) i += 1;
    const a = k[i];
    const b = k[i + 1];
    const u = (t - a.t) / (b.t - a.t);
    s = lerp(a.s, b.s, u);
  }
  const w = ELLIPSE.w * s;
  const h = ELLIPSE.h * s;
  return { x: FW - w, y: FH - h, w, h };
}

const SLAB_W = 587;
const SUN_W = 458 / SLAB_W;

const LAYERS = [
  {
    title: "Development buffers",
    body: "gives the garden room to thrive.",
    src: "/landing/layer-4-sun.png",
    img: { w: 901, h: 341 },
    width: SUN_W,
    z: 3,
  },
  {
    title: "Community stewardship",
    body: "keeps people invested in its future.",
    src: "/landing/layer-3-community.png",
    img: { w: 1169, h: 901 },
    width: 1,
    z: 4,
  },
  {
    title: "Supportive policies",
    body: "help it grow.",
    src: "/landing/layer-2-water.png",
    img: { w: 1186, h: 559 },
    width: 1,
    z: 2,
  },
  {
    title: "Secure land",
    body: "allows it to take root.",
    src: "/landing/layer-1-soil.png",
    img: { w: 1186, h: 572 },
    width: 1,
    z: 1,
  },
] as const;

function useEnterSteps(active: boolean, delays: readonly number[], forceAll: boolean) {
  const [step, setStep] = useState(0);
  const key = delays.join(",");
  useEffect(() => {
    const ms = key.split(",").map(Number);
    if (!active) {
      setStep(0);
      return;
    }
    if (forceAll) {
      setStep(ms.length);
      return;
    }
    setStep(0);
    const timers = ms.map((delay, i) =>
      setTimeout(() => setStep(i + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [active, forceAll, key]);
  return forceAll ? delays.length : step;
}

function coverFade(topY: number, textY: number, band = 70) {
  if (topY >= textY + band) return 1;
  if (topY <= textY) return 0;
  return (topY - textY) / band;
}

function GrowingBuilding({
  src,
  box,
  grow,
  z,
  opacity = 1,
}: {
  src: string;
  box: { x: number; y: number; w: number; h: number };
  grow: number;
  z: number;
  opacity?: number;
}) {
  if (grow <= 0.01 || opacity <= 0.01) return null;
  return (
    <img
      src={src}
      alt=""
      className="absolute pointer-events-none select-none"
      style={{
        zIndex: z,
        left: `${(box.x / FW) * 100}%`,
        top: `${(box.y / FH) * 100}%`,
        width: `${(box.w / FW) * 100}%`,
        height: `${(box.h / FH) * 100}%`,
        objectFit: "contain",
        objectPosition: "bottom",
        transform: `scaleY(${grow})`,
        transformOrigin: "bottom center",
        opacity,
      }}
    />
  );
}

function buildingTop(box: { y: number; h: number }, grow: number) {
  if (grow <= 0.01) return FH;
  return box.y + box.h * (1 - grow);
}

function GardenArt({ src, opacity }: { src: string; opacity: number }) {
  if (opacity <= 0.01) return null;
  return (
    <img
      src={src}
      alt=""
      className="absolute right-0 bottom-0 z-[1] pointer-events-none select-none"
      style={{
        opacity,
        width: `${(PEACH_ART.w / FW) * 100}%`,
        height: `${(PEACH_ART.h / FH) * 100}%`,
        objectFit: "contain",
        objectPosition: "right bottom",
      }}
    />
  );
}

function BrutalistButton({
  children,
  onClick,
  className = "",
}: {
  children: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nb-press border-2 border-[#3f3f3f] bg-[#fbf7ff] text-[#3f3f3f] font-medium tracking-[-0.05em] rounded-[10px] shadow-[4px_4px_0_0_#3f3f3f] ${className}`}
    >
      {children}
    </button>
  );
}

export default function App({ onGetStarted, resetNonce = 0 }: LandingPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const [p, setP] = useState(0);
  const [introArt, setIntroArt] = useState(false);
  const [introText, setIntroText] = useState(false);
  const [hoverLayer, setHoverLayer] = useState<number | null>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const visualColRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const visualRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [visualTops, setVisualTops] = useState<number[]>(() => LAYERS.map(() => 0));

  useMotionValueEvent(scrollYProgress, "change", (v) => setP(v));

  useEffect(() => {
    PRELOAD.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setIntroArt(false);
    setIntroText(false);
    const art = window.setTimeout(() => setIntroArt(true), 90);
    const text = window.setTimeout(() => setIntroText(true), 720);
    return () => {
      window.clearTimeout(art);
      window.clearTimeout(text);
    };
  }, [resetNonce]);

  const scrolled = p > 0.02;
  const showArt = introArt || scrolled;
  const showOpenText = introText || scrolled;

  const people = span(p, T.people, T.threat);
  const threat = span(p, T.threat, T.stripPlanters);
  const shadowT = span(p, T.shadow, T.more);
  const moreT = span(p, T.more, T.tall);
  const tallT = span(p, T.tall, T.zoom);
  const zoomT = span(p, T.zoom, T.map);
  const mapIn = span(p, T.map, T.layers);
  const layersIn = span(p, T.layers, T.hands);

  const sceneHome = fade(p, 0, 0, T.people, T.threat) * (showArt ? 1 : 0);
  const scenePeople = fade(p, T.people, (T.people + T.threat) / 2, T.threat, T.stripPlanters);
  const peachOn = fade(p, T.threat, T.stripPlanters, T.shadow, T.more) * (showArt ? 1 : 0);
  const shadowOn = fade(p, T.shadow, T.more, T.map - 0.02, T.map) * (showArt ? 1 : 0);
  const ground = fade(p, 0, 0, T.threat, T.stripPlanters) * (showArt ? 1 : 0);

  const mintOpen = p < T.map - 0.02;
  const onScreen1 = p < T.people;
  const moreGrow = span(moreT, 0, 1);
  const tallGrow = span(tallT, 0, 1);
  const skyTop = Math.min(
    FH,
    buildingTop(SHADOW_MORE, moreGrow),
    buildingTop(SHADOW_TALL, tallGrow),
  );
  const headlineCover = shadowOn > 0.2 ? coverFade(skyTop, HEADLINE_Y) : 1;
  const subCover = shadowOn > 0.2 ? coverFade(skyTop, SUB_Y) : 1;
  const zoomEase = zoomT * zoomT;
  const zoomScale = 1 + zoomEase * 18;
  const zoomOriginX =
    ((SHADOW_TALL.x + SHADOW_TALL.w * TALL_ZOOM.x) / FW) * 100;
  const zoomOriginY =
    ((SHADOW_TALL.y + SHADOW_TALL.h * TALL_ZOOM.y) / FH) * 100;
  const inkFill = span(zoomT, 0.28, 0.62);

  const mapActive = p >= T.map - 0.01 && p < T.layers;
  const mapForce = p > (T.map + T.layers) / 2;
  const mapStep = useEnterSteps(mapActive, MAP_DELAYS, mapForce);
  const mapBody = span(p, T.map + 0.04, T.layers - 0.025);

  const layerReveal = span(p, T.layers + 0.02, T.hands - 0.04);
  const ellipseT = span(p, T.hands, T.action);
  const isoContent = 1 - span(ellipseT, TOGETHER_ARRIVE_T, TOGETHER_ISO_GONE_T);
  const handsArt =
    ellipseT >= TOGETHER_ISO_GONE_T
      ? span(ellipseT, TOGETHER_ISO_GONE_T, TOGETHER_ISO_GONE_T + 0.08) *
        (1 - span(ellipseT, TOGETHER_HOLD_T, TOGETHER_HOLD_T + 0.16))
      : 0;
  const handsText =
    ellipseT >= TOGETHER_ISO_GONE_T
      ? span(ellipseT, TOGETHER_ISO_GONE_T + 0.03, TOGETHER_ISO_GONE_T + 0.1) *
        (1 - span(ellipseT, TOGETHER_HOLD_T, TOGETHER_HOLD_T + 0.14))
      : 0;
  const megaRise = span(ellipseT, TOGETHER_HOLD_T, 1);
  const megaLanded = megaRise >= 0.995;

  const actionActive = megaLanded;
  const actionForce = p > 0.96;
  const actionStep = useEnterSteps(actionActive, ACTION_DELAYS, actionForce);

  const actionHeadline = actionStep >= 1;
  const actionBody = actionStep >= 2;
  const actionCta = actionStep >= 3;
  const ell = ellipseAt(ellipseT);
  const isoPage = fade(p, T.layers, T.layers + 0.03, T.action, T.action + 0.02);
  const ellipseMask =
    p >= T.hands
      ? {
          WebkitMaskImage: "url(/landing/ellipse-mint.svg)",
          maskImage: "url(/landing/ellipse-mint.svg)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "right bottom",
          maskPosition: "right bottom",
          WebkitMaskSize: `${(ell.w / FW) * 100}% auto`,
          maskSize: `${(ell.w / FW) * 100}% auto`,
        }
      : undefined;
  const alignVisuals = useRef(() => {});

  useLayoutEffect(() => {
    if (layersIn <= 0) return;
    const textCol = textColRef.current;
    const visCol = visualColRef.current;
    if (!textCol || !visCol) return;

    const align = () => {
      const textColRect = textCol.getBoundingClientRect();
      const visColRect = visCol.getBoundingClientRect();
      const stackW = visColRect.width * 0.5;
      const next = LAYERS.map((layer, i) => {
        const textEl = textRefs.current[i];
        if (!textEl) return 0;
        const visEl = visualRefs.current[i];
        const visH =
          visEl?.offsetHeight || stackW * layer.width * (layer.img.h / layer.img.w);
        const textCenter = textColRect.top + textEl.offsetTop + textEl.offsetHeight / 2;
        return textCenter - visColRect.top - visH / 2;
      });
      setVisualTops((prev) => (prev.every((v, i) => Math.abs(v - next[i]) < 0.5) ? prev : next));
    };

    alignVisuals.current = align;
    align();
    const ro = new ResizeObserver(align);
    ro.observe(textCol);
    ro.observe(visCol);
    window.addEventListener("resize", align);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", align);
    };
  }, [layersIn]);

  const skipToExplore = useCallback(() => onGetStarted?.(), [onGetStarted]);

  const openHeadline = showOpenText && threat < 0.45;
  const extraBody = people > 0.18 && threat < 0.45;
  const threatGone = (1 - span(tallGrow, 0.7, 0.98)) * (1 - span(zoomT, 0, 0.1)) * (1 - inkFill);
  const threatCopy = threat >= 0.45 && p < T.zoom && headlineCover * threatGone > 0.02;
  const threatSubOp =
    shadowT > 0.12 && p < T.zoom
      ? span(shadowT, 0.12, 0.5) * subCover * (1 - span(moreGrow, 0.55, 0.9)) * threatGone
      : 0;

  return (
    <div
      ref={scrollRef}
      className="landing-story relative h-dvh overflow-y-auto overscroll-none"
      style={{ background: mintOpen ? MINT : GREEN, fontFamily: "Inter, sans-serif" }}
    >
      <div className="relative" style={{ height: `${STORY_VH}vh` }}>
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div
            className="absolute inset-0 transition-colors duration-500"
            style={{
              background: mapIn > 0.12 ? GREEN : inkFill > 0.92 ? SHADOW_INK : MINT,
            }}
          />

          {ground > 0.01 && (
            <div
              className="absolute left-0 right-0 bottom-0 z-0 pointer-events-none"
              style={{
                opacity: ground,
                height: `${(GROUND_H / FH) * 100}%`,
                background: GREEN,
              }}
            />
          )}

          <GardenArt src="/landing/art-garden.png" opacity={sceneHome} />
          <GardenArt src="/landing/art-garden-people.png" opacity={scenePeople} />

          {(peachOn > 0.01 || shadowOn > 0.01) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
              }}
            >
              {peachOn > 0.01 && (
                <img
                  src="/landing/art-skyline.png"
                  alt=""
                  className="absolute right-0 bottom-0 z-[2] select-none"
                  style={{
                    opacity: peachOn,
                    width: `${(PEACH_ART.w / FW) * 100}%`,
                    height: `${(PEACH_ART.h / FH) * 100}%`,
                    objectFit: "contain",
                    objectPosition: "right bottom",
                  }}
                />
              )}
              {shadowOn > 0.01 && (
                <img
                  src="/landing/art-buildings.png"
                  alt=""
                  className="absolute bottom-0 z-[2] select-none"
                  style={{
                    opacity: shadowOn,
                    right: `${(-SHADOW_NUDGE / FW) * 100}%`,
                    width: `${(PEACH_ART.w / FW) * 100}%`,
                    height: `${(PEACH_ART.h / FH) * 100}%`,
                    objectFit: "cover",
                    objectPosition: "left bottom",
                  }}
                />
              )}
              <GrowingBuilding
                src={SHADOW_MORE.src}
                box={SHADOW_MORE}
                grow={moreGrow}
                z={3}
                opacity={shadowOn}
              />
              <GrowingBuilding
                src={SHADOW_TALL.src}
                box={SHADOW_TALL}
                grow={tallGrow}
                z={1}
                opacity={shadowOn}
              />
            </div>
          )}

          {inkFill > 0 && mapIn < 0.25 && (
            <div
              className="absolute inset-0 pointer-events-none z-[8]"
              style={{
                background: SHADOW_INK,
                opacity: inkFill * (1 - mapIn),
              }}
            />
          )}

          {mapIn > 0 && p < T.layers + 0.06 && (
            <div
              className="absolute inset-0"
              style={{
                background: GREEN,
                opacity: fade(p, T.map, T.map + 0.03, T.layers, T.layers + 0.04),
              }}
            >
              <div
                className="absolute inset-0 flex flex-col lg:flex-row lg:items-center gap-8 px-6 sm:px-12 lg:px-16 pt-20 lg:pt-0"
                style={{ opacity: mapStep >= 1 ? 1 : 0, transition: "opacity 480ms ease" }}
              >
                <div className="lg:w-[42%] shrink-0">
                  <h2
                    className="font-medium tracking-[-0.05em] text-[#f5f5f5] leading-[1.05]"
                    style={{ fontSize: H1 }}
                  >
                    That’s why we built Rooted NYC:
                  </h2>
                  <p
                    className="mt-6 font-medium tracking-[-0.05em] text-[#f5f5f5] leading-[1.45] max-w-md"
                    style={{
                      fontSize: H2,
                      opacity: mapBody,
                    }}
                  >
                    to make that resilience visible by measuring 4 conditions that help each garden endure.
                  </p>
                </div>
                <div
                  className="relative flex-1 min-h-0"
                  style={{
                    opacity: mapStep >= 2 ? 1 : 0,
                    transform: mapStep >= 2 ? "translateY(0)" : "translateY(28px)",
                    transition: "opacity 560ms ease, transform 560ms ease",
                  }}
                >
                  <img
                    src="/landing/map-mockup.png"
                    alt="Rooted NYC explore map"
                    className="w-full h-auto max-h-[72vh] object-cover object-left rounded-[30px] border-[3px] border-[#414141] shadow-[0_24px_48px_rgba(0,0,0,0.28)]"
                  />
                </div>
              </div>
            </div>
          )}

          {p >= T.hands && (
            <div
              className="absolute inset-0"
              style={{ background: GREEN }}
            />
          )}

          {isoPage > 0.01 && (
            <div
              className="absolute inset-0 z-[1]"
              style={{ background: MINT, opacity: isoPage, ...ellipseMask }}
            >
              {isoContent > 0.01 && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ opacity: isoContent }}
                >
                <div className="flex flex-row items-stretch gap-6 lg:gap-8 px-4">
                  <div
                    ref={textColRef}
                    className="relative flex flex-col justify-center gap-7 lg:gap-9 shrink-0"
                  >
                    {LAYERS.map((layer, i) => {
                      const fromBottom = 3 - i;
                      const shown = layerReveal >= (fromBottom + 0.15) / 4;
                      const dim = hoverLayer !== null && hoverLayer !== i;
                      return (
                        <button
                          key={layer.title}
                          ref={(el) => {
                            textRefs.current[i] = el;
                          }}
                          type="button"
                          className="text-left transition-opacity duration-200"
                          style={{
                            opacity: shown ? (dim ? 0.28 : 1) : 0,
                            transform: shown ? "translateY(0)" : "translateY(18px)",
                            transition: "opacity 420ms ease, transform 420ms ease",
                          }}
                          onMouseEnter={() => setHoverLayer(i)}
                          onMouseLeave={() => setHoverLayer(null)}
                        >
                          <p
                            className="font-medium tracking-[-0.05em] text-[#3f3f3f] leading-[1.05] lg:whitespace-nowrap"
                            style={{ fontSize: "clamp(1.85rem, 4vw, 3.75rem)" }}
                          >
                            {layer.title}
                          </p>
                          <p
                            className="mt-1 font-medium tracking-[-0.05em] text-[#3f3f3f] leading-[1.4]"
                            style={{ fontSize: H2 }}
                          >
                            {layer.body}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    ref={visualColRef}
                    className="relative w-[min(34vw,460px)] shrink-0"
                  >
                    {LAYERS.map((layer, i) => {
                      const fromBottom = 3 - i;
                      const shown = layerReveal >= (fromBottom + 0.15) / 4;
                      const dim = hoverLayer !== null && hoverLayer !== i;
                      return (
                        <button
                          key={layer.title}
                          ref={(el) => {
                            visualRefs.current[i] = el;
                          }}
                          type="button"
                          className="absolute bg-transparent p-0 border-0 cursor-pointer overflow-visible"
                          style={{
                            top: visualTops[i] ?? 0,
                            left: `${((1 - layer.width) / 2) * 100}%`,
                            width: `${layer.width * 100}%`,
                            zIndex: layer.z,
                            opacity: shown ? (dim ? 0.28 : 1) : 0,
                            transform: shown ? "translateY(0)" : "translateY(18px)",
                            transition: "opacity 420ms ease, transform 420ms ease",
                          }}
                          onMouseEnter={() => setHoverLayer(i)}
                          onMouseLeave={() => setHoverLayer(null)}
                          aria-label={layer.title}
                        >
                          <img
                            src={layer.src}
                            alt=""
                            className="block w-full h-auto pointer-events-none select-none"
                            onLoad={() => alignVisuals.current()}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}
              {handsArt > 0 && (
                <img
                  src="/landing/art-hands.png"
                  alt=""
                  className="absolute pointer-events-none select-none max-w-none"
                  style={{
                    opacity: handsArt,
                    left: `${(HANDS_BOX.x / FW) * 100}%`,
                    top: `${(HANDS_BOX.y / FH) * 100}%`,
                    width: `${(HANDS_BOX.w / FW) * 100}%`,
                    height: `${(HANDS_BOX.h / FH) * 100}%`,
                    objectFit: "contain",
                    objectPosition: "left top",
                  }}
                />
              )}
            </div>
          )}

          {p >= T.hands && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
              <div
                className="absolute left-6 sm:left-16 top-16 sm:top-24 max-w-4xl z-10"
                style={{
                  opacity: handsText * (1 - span(p, T.action - 0.04, T.action)),
                }}
              >
                <h2
                  className="font-medium tracking-[-0.05em] text-[#f5f5f5] leading-[1.05]"
                  style={{ fontSize: H1 }}
                >
                  Together, these dimensions shape a garden’s resilience.
                </h2>
              </div>
            </div>
          )}

          {p >= T.hands && megaRise > 0 && (
            <img
              src="/landing/art-megaphone.png"
              alt=""
              className="absolute left-0 right-0 w-full object-cover object-right-bottom pointer-events-none select-none z-[15] max-w-none"
              style={{
                height: `${100 + megaRise * 5}%`,
                bottom: `${-megaRise * 5}%`,
                top: "auto",
                transform: `translate(${(1 - megaRise) * -110}%, ${(1 - megaRise) * -110}%)`,
              }}
            />
          )}

          {megaLanded && (
            <>
              <h2
                className="absolute z-20 font-medium tracking-[-0.05em] text-[#3f3f3f] leading-[1.05]"
                style={{
                  left: `${(96 / FW) * 100}%`,
                  top: `${(123 / FH) * 100}%`,
                  width: `${(738 / FW) * 100}%`,
                  fontSize: H1,
                  opacity: actionHeadline ? 1 : 0,
                  transition: "opacity 480ms ease",
                }}
              >
                Score only matters if it leads to action.
              </h2>
              <div
                className="absolute z-20"
                style={{
                  left: `${(96 / FW) * 100}%`,
                  bottom: `${((FH - 970 - 42) / FH) * 100}%`,
                  width: `${(738 / FW) * 100}%`,
                }}
              >
                <p
                  className="font-medium tracking-[-0.05em] text-[#f3f3f3] leading-[1.45] max-w-md"
                  style={{
                    fontSize: H2,
                    opacity: actionBody ? 1 : 0,
                    transition: "opacity 480ms ease",
                  }}
                >
                  Every one of us can help protect NYC’s community gardens, and we’ll show you where to start.
                </p>
                <div
                  style={{
                    opacity: actionCta ? 1 : 0,
                    pointerEvents: actionCta ? "auto" : "none",
                    transition: "opacity 480ms ease",
                  }}
                >
                  <BrutalistButton
                    className="mt-6 px-6 py-2 text-[20px]"
                    onClick={skipToExplore}
                  >
                    I’m ready!
                  </BrutalistButton>
                </div>
              </div>
            </>
          )}

          {mintOpen && (
            <div className="absolute left-6 sm:left-[8%] top-[12%] sm:top-[15%] z-20 max-w-[48rem] pr-4">
              {openHeadline && (
                <div
                  style={{
                    opacity: showOpenText ? 1 : 0,
                    transform: showOpenText ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 560ms ease, transform 560ms ease",
                  }}
                >
                  <h1
                    className="font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.05]"
                    style={{ fontSize: H1 }}
                  >
                    NYC is home
                    <br />
                    to 600+ community gardens
                  </h1>
                  <p
                    className="mt-4 font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.4]"
                    style={{ fontSize: H2 }}
                  >
                    that grow more than food—
                  </p>
                </div>
              )}
              {extraBody && (
                <p
                  className="mt-10 font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.4] max-w-lg"
                  style={{ fontSize: H2 }}
                >
                  they create green space, community, and a living record of neighborhood history
                </p>
              )}
            </div>
          )}

          {threatCopy && (
            <h2
              className="absolute z-[6] font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.05]"
              style={{
                left: `${(155 / FW) * 100}%`,
                top: `${(HEADLINE_Y / FH) * 100}%`,
                width: `${(1434 / FW) * 100}%`,
                fontSize: H1,
                opacity: headlineCover * threatGone,
              }}
            >
              Yet gardens have been fighting to stay{" "}
              <span className="underline decoration-[3px] underline-offset-[6px]">rooted</span>{" "}
              for decades
            </h2>
          )}
          {threatSubOp > 0.02 && (
            <p
              className="absolute z-[6] font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.4]"
              style={{
                left: `${(155 / FW) * 100}%`,
                top: `${(SUB_Y / FH) * 100}%`,
                width: `${(581 / FW) * 100}%`,
                fontSize: H2,
                opacity: threatSubOp,
              }}
            >
              with hundreds of threats from development, displacement, and changing land priorities.
            </p>
          )}

          {onScreen1 && (
            <BrutalistButton
              className="absolute top-4 right-4 sm:top-8 sm:right-8 z-30 px-4 py-2 text-[0.95rem]"
              onClick={skipToExplore}
            >
              Skip
            </BrutalistButton>
          )}
        </div>
      </div>
    </div>
  );
}
