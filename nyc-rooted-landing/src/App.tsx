import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

export interface LandingPageProps {
  onGetStarted?: () => void;
  resetNonce?: number;
}

const MINT = "#f4fff4";
const GREEN = "#306a4e";

const MAP_DELAYS = [120, 480, 860] as const;
const ACTION_DELAYS = [120, 560, 1040] as const;
const LAYER_DELAYS = [140, 420, 700, 980] as const;
const BEAT_MS = 820;
const HOLD_LOCK_MS = 1000;

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

/** Discrete early story beats — one gesture = one settled frame (no mid-fade rests). */
const EARLY_TARGETS = [
  0,
  (T.people + T.threat) / 2,
  T.shadow,
] as const;
const EARLY_LAST = EARLY_TARGETS.length - 1;

type Phase = "early" | "distance" | "map" | "layers" | "together" | "action";

const PHASE_PIN: Record<"map" | "layers" | "action", number> = {
  map: T.map,
  layers: T.layers,
  action: T.action,
};

function clamp(n: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, n));
}

function span(p: number, a: number, b: number) {
  if (b <= a) return p >= a ? 1 : 0;
  return clamp((p - a) / (b - a));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const FW = 1728;
const FH = 1117;
const PEACH_ART = { w: 1265, h: 743 };
const ALIGN_DX = FW - PEACH_ART.w - 308;
/** Dark shadow skyline: same anchor as peach art (no x/y nudge). */
const SHADOW_ART_DX = 0;
const SHADOW_ART_DY = 0;
const SHADOW_MORE = {
  src: "/landing/art-buildings-more.png",
  x: 134 + ALIGN_DX + SHADOW_ART_DX,
  y: 374 + SHADOW_ART_DY,
  w: 304,
  h: 743,
};
const SHADOW_TALL = {
  src: "/landing/art-buildings-tall.png",
  x: 493 + ALIGN_DX + SHADOW_ART_DX,
  y: 108 + SHADOW_ART_DY,
  w: 434,
  h: 1009,
};
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
/** Scroll progress where the soft shape sits at its ideal hold size. */
const HOLD_PROGRESS = T.hands + TOGETHER_HOLD_T * (T.action - T.hands);
const ELLIPSE_KF = [
  { t: 0, s: 2.05 },
  { t: TOGETHER_ARRIVE_T, s: TOGETHER_S },
  { t: TOGETHER_HOLD_T, s: TOGETHER_S },
  { t: 0.74, s: 0.52 },
  { t: 0.88, s: 0.26 },
  { t: 1, s: 0 },
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
  return (
    <img
      src={src}
      alt=""
      className="absolute right-0 bottom-0 z-[2] pointer-events-none select-none"
      style={{
        opacity,
        width: `${(PEACH_ART.w / FW) * 100}%`,
        height: `${(PEACH_ART.h / FH) * 100}%`,
        objectFit: "contain",
        objectPosition: "right bottom",
        transition: "opacity 560ms ease",
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
  const [earlyStep, setEarlyStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("early");
  const [togetherHold, setTogetherHold] = useState(false);
  const [togetherExit, setTogetherExit] = useState(false);
  const [hoverLayer, setHoverLayer] = useState<number | null>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const visualColRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const visualRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [visualTops, setVisualTops] = useState<number[]>(() => LAYERS.map(() => 0));
  const phaseRef = useRef<Phase>("early");
  const earlyStepRef = useRef(0);
  const togetherHoldRef = useRef(false);
  const togetherExitRef = useRef(false);
  const beatLocked = useRef(false);
  const beatLockMs = useRef(BEAT_MS);
  const beatReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);
  const mapReadyRef = useRef(false);
  const layersReadyRef = useRef(false);

  phaseRef.current = phase;
  earlyStepRef.current = earlyStep;
  togetherHoldRef.current = togetherHold;
  togetherExitRef.current = togetherExit;

  const maxScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    return Math.max(0, el.scrollHeight - el.clientHeight);
  }, []);

  const pinProgress = useCallback(
    (progress: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = maxScroll();
      if (max <= 0) return;
      el.scrollTop = clamp(progress, 0, 1) * max;
    },
    [maxScroll],
  );

  const scheduleBeatUnlock = useCallback(() => {
    if (beatReleaseTimer.current) clearTimeout(beatReleaseTimer.current);
    beatReleaseTimer.current = setTimeout(() => {
      beatLocked.current = false;
    }, beatLockMs.current);
  }, []);

  const lockBeat = useCallback(
    (ms = BEAT_MS) => {
      beatLockMs.current = ms;
      beatLocked.current = true;
      scheduleBeatUnlock();
    },
    [scheduleBeatUnlock],
  );

  const settleTogetherHold = useCallback(() => {
    if (togetherHoldRef.current) {
      if (!togetherExitRef.current) pinProgress(HOLD_PROGRESS);
      return;
    }
    togetherHoldRef.current = true;
    togetherExitRef.current = false;
    setTogetherHold(true);
    setTogetherExit(false);
    pinProgress(HOLD_PROGRESS);
    lockBeat(HOLD_LOCK_MS);
  }, [lockBeat, pinProgress]);

  const beginTogetherExit = useCallback(() => {
    togetherExitRef.current = true;
    setTogetherExit(true);
  }, []);

  const enterPhase = useCallback(
    (next: Phase, early = 0) => {
      phaseRef.current = next;
      setPhase(next);
      if (next !== "together" && next !== "action") {
        togetherHoldRef.current = false;
        togetherExitRef.current = false;
        setTogetherHold(false);
        setTogetherExit(false);
      }
      if (next === "early") {
        earlyStepRef.current = early;
        setEarlyStep(early);
        pinProgress(EARLY_TARGETS[clamp(early, 0, EARLY_LAST)]);
      } else if (next === "distance") {
        pinProgress(T.more);
      } else if (next === "together") {
        togetherHoldRef.current = false;
        togetherExitRef.current = false;
        setTogetherHold(false);
        setTogetherExit(false);
        pinProgress(T.hands);
      } else {
        pinProgress(PHASE_PIN[next]);
      }
    },
    [pinProgress],
  );

  const advanceStory = useCallback(
    (dir: 1 | -1) => {
      const current = phaseRef.current;
      if (beatLocked.current) {
        scheduleBeatUnlock();
        return;
      }

      if (current === "early") {
        const cur = earlyStepRef.current;
        if (dir > 0 && cur >= EARLY_LAST) {
          lockBeat();
          enterPhase("distance");
          return;
        }
        const next = clamp(cur + dir, 0, EARLY_LAST);
        if (next === cur) return;
        lockBeat();
        earlyStepRef.current = next;
        setEarlyStep(next);
        pinProgress(EARLY_TARGETS[next]);
        return;
      }

      if (current === "distance") {
        if (dir < 0) {
          lockBeat();
          enterPhase("early", EARLY_LAST);
        }
        return;
      }

      if (current === "map") {
        if (dir > 0 && !mapReadyRef.current) {
          lockBeat();
          return;
        }
        lockBeat();
        if (dir > 0) enterPhase("layers");
        else enterPhase("distance");
        return;
      }

      if (current === "layers") {
        if (dir > 0 && !layersReadyRef.current) {
          lockBeat();
          return;
        }
        lockBeat();
        if (dir > 0) enterPhase("together");
        else enterPhase("map");
        return;
      }

      if (current === "together") {
        if (dir < 0) {
          if (togetherExitRef.current) {
            lockBeat();
            togetherExitRef.current = false;
            setTogetherExit(false);
            pinProgress(HOLD_PROGRESS);
            return;
          }
          if (togetherHoldRef.current) {
            lockBeat();
            togetherHoldRef.current = false;
            setTogetherHold(false);
            pinProgress(Math.max(T.hands, HOLD_PROGRESS - 0.04));
            return;
          }
          lockBeat();
          enterPhase("layers");
          return;
        }
        if (!togetherHoldRef.current) return;
        if (!togetherExitRef.current) {
          beginTogetherExit();
          pinProgress(Math.min(1, HOLD_PROGRESS + 0.012));
          return;
        }
        return;
      }

      if (current === "action" && dir < 0) {
        lockBeat();
        phaseRef.current = "together";
        setPhase("together");
        togetherHoldRef.current = true;
        togetherExitRef.current = false;
        setTogetherHold(true);
        setTogetherExit(false);
        pinProgress(HOLD_PROGRESS);
        lockBeat(HOLD_LOCK_MS);
      }
    },
    [beginTogetherExit, enterPhase, lockBeat, pinProgress, scheduleBeatUnlock],
  );

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setP(v);
    if (phaseRef.current === "distance") {
      if (v >= T.map - 0.004) {
        enterPhase("map");
        return;
      }
      if (v <= EARLY_TARGETS[EARLY_LAST] + 0.01) {
        enterPhase("early", EARLY_LAST);
      }
      return;
    }
    if (phaseRef.current === "together") {
      if (togetherExitRef.current) {
        if (v >= T.action - 0.008) {
          enterPhase("action");
          return;
        }
        if (v <= HOLD_PROGRESS + 0.004) {
          togetherExitRef.current = false;
          setTogetherExit(false);
          pinProgress(HOLD_PROGRESS);
        }
        return;
      }
      if (togetherHoldRef.current) {
        pinProgress(HOLD_PROGRESS);
        return;
      }
      if (v >= HOLD_PROGRESS - 0.002) {
        settleTogetherHold();
        return;
      }
      if (v < T.hands - 0.01) {
        enterPhase("layers");
      }
    }
  });

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
    setEarlyStep(0);
    setPhase("early");
    setTogetherHold(false);
    setTogetherExit(false);
    earlyStepRef.current = 0;
    phaseRef.current = "early";
    togetherHoldRef.current = false;
    togetherExitRef.current = false;
    beatLocked.current = false;
    const art = window.setTimeout(() => setIntroArt(true), 90);
    const text = window.setTimeout(() => setIntroText(true), 90);
    return () => {
      window.clearTimeout(art);
      window.clearTimeout(text);
    };
  }, [resetNonce]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const current = phaseRef.current;
      if (current === "together" && togetherHoldRef.current && !togetherExitRef.current) {
        e.preventDefault();
        if (beatLocked.current) {
          scheduleBeatUnlock();
          return;
        }
        if (e.deltaY > 8) advanceStory(1);
        else if (e.deltaY < -8) advanceStory(-1);
        return;
      }
      if (current === "distance" || current === "together") {
        if (
          current === "distance" &&
          e.deltaY < -8 &&
          el.scrollTop <= maxScroll() * (T.more + 0.01)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        if (
          current === "together" &&
          togetherExitRef.current &&
          e.deltaY < -8 &&
          el.scrollTop <= maxScroll() * (HOLD_PROGRESS + 0.012)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        if (
          current === "together" &&
          !togetherHoldRef.current &&
          e.deltaY < -8 &&
          el.scrollTop <= maxScroll() * (T.hands + 0.012)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        return;
      }
      e.preventDefault();
      if (e.deltaY > 8) advanceStory(1);
      else if (e.deltaY < -8) advanceStory(-1);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const current = phaseRef.current;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
      const delta = touchStartY.current - endY;
      if (Math.abs(delta) < 40) return;
      if (current === "together" && togetherHoldRef.current && !togetherExitRef.current) {
        e.preventDefault();
        if (beatLocked.current) {
          scheduleBeatUnlock();
          return;
        }
        advanceStory(delta > 0 ? 1 : -1);
        return;
      }
      if (current === "distance" || current === "together") {
        if (
          current === "distance" &&
          delta < 0 &&
          el.scrollTop <= maxScroll() * (T.more + 0.01)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        if (
          current === "together" &&
          togetherExitRef.current &&
          delta < 0 &&
          el.scrollTop <= maxScroll() * (HOLD_PROGRESS + 0.012)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        if (
          current === "together" &&
          !togetherHoldRef.current &&
          delta < 0 &&
          el.scrollTop <= maxScroll() * (T.hands + 0.012)
        ) {
          e.preventDefault();
          advanceStory(-1);
        }
        return;
      }
      e.preventDefault();
      advanceStory(delta > 0 ? 1 : -1);
    };

    const onScroll = () => {
      const current = phaseRef.current;
      if (current === "early") {
        pinProgress(EARLY_TARGETS[earlyStepRef.current]);
        return;
      }
      if (current === "distance") return;
      if (current === "together") {
        if (togetherHoldRef.current && !togetherExitRef.current) {
          pinProgress(HOLD_PROGRESS);
          return;
        }
        if (togetherExitRef.current) return;
        if (el.scrollTop >= maxScroll() * (HOLD_PROGRESS - 0.001)) {
          settleTogetherHold();
        }
        return;
      }
      pinProgress(PHASE_PIN[current]);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("scroll", onScroll);
      if (beatReleaseTimer.current) clearTimeout(beatReleaseTimer.current);
    };
  }, [advanceStory, maxScroll, pinProgress, scheduleBeatUnlock, settleTogetherHold]);

  useEffect(() => {
    if (phase === "early") pinProgress(EARLY_TARGETS[earlyStep]);
    else if (phase === "distance") {
      /* free scroll */
    } else if (phase === "together") {
      if (togetherHold && !togetherExit) pinProgress(HOLD_PROGRESS);
    } else pinProgress(PHASE_PIN[phase]);
  }, [phase, earlyStep, togetherHold, togetherExit, pinProgress]);

  const inEarly = phase === "early";
  const showArt = introArt || earlyStep > 0 || phase !== "early";
  const showOpenText = introText || earlyStep > 0 || phase !== "early";

  const mapActive = phase === "map";
  const mapStep = useEnterSteps(mapActive, MAP_DELAYS, false);
  const mapReady = mapStep >= MAP_DELAYS.length;
  const mapBody = mapStep >= 2 ? 1 : 0;

  const layersActive = phase === "layers";
  const layerStep = useEnterSteps(layersActive, LAYER_DELAYS, false);
  const layersReady = layerStep >= LAYER_DELAYS.length;

  mapReadyRef.current = mapReady;
  layersReadyRef.current = layersReady;

  const moreT = phase === "distance" ? span(p, T.more, T.tall) : phase === "early" ? 0 : 1;
  const tallT = phase === "distance" ? span(p, T.tall, T.zoom) : phase === "early" ? 0 : 1;
  const zoomT =
    phase === "distance" ? span(p, T.zoom, T.map) : phase === "early" ? 0 : 1;
  const mapIn = phase === "map" ? 1 : 0;
  const layersIn = phase === "layers" || phase === "together" ? 1 : 0;

  const sceneHome = inEarly && earlyStep === 0 && showArt ? 1 : 0;
  const scenePeople = inEarly && earlyStep === 1 ? 1 : 0;
  const peachOn = inEarly
    ? earlyStep >= 2
      ? 1
      : 0
    : phase === "distance"
      ? Math.max(0, 1 - span(p, T.more, T.zoom) * 0.85)
      : 0;
  const shadowOn =
    phase === "early" ? (earlyStep >= 2 ? 1 : 0) : phase === "distance" ? 1 : 0;
  const ground = inEarly && earlyStep < 2 && showArt ? 1 : 0;

  const mintOpen = phase === "early" || phase === "distance";
  const onScreen1 = phase === "early" && earlyStep === 0;
  const moreGrow = span(moreT, 0, 1);
  const tallGrow = span(tallT, 0, 1);
  const skyTop = Math.min(
    FH,
    buildingTop(SHADOW_MORE, moreGrow),
    buildingTop(SHADOW_TALL, tallGrow),
  );
  const headlineCover = shadowOn > 0.2 ? coverFade(skyTop, HEADLINE_Y, 130) : 1;
  const subCover = shadowOn > 0.2 ? coverFade(skyTop, SUB_Y, 150) : 1;
  const zoomEase = zoomT * zoomT;
  const zoomScale = 1 + zoomEase * 18;
  const zoomOriginX =
    ((SHADOW_TALL.x + SHADOW_TALL.w * TALL_ZOOM.x) / FW) * 100;
  const zoomOriginY =
    ((SHADOW_TALL.y + SHADOW_TALL.h * TALL_ZOOM.y) / FH) * 100;
  const inkFill = phase === "distance" ? span(zoomT, 0.28, 0.62) : 0;
  const storyBg =
    phase === "layers"
      ? MINT
      : phase === "map" || phase === "together" || phase === "action"
        ? GREEN
        : inkFill > 0.92
          ? SHADOW_INK
          : MINT;

  const exitT =
    phase === "action"
      ? 1
      : phase === "together" && togetherExit
        ? span(p, HOLD_PROGRESS, T.action)
        : 0;
  const ellipseT =
    phase === "action"
      ? 1
      : phase === "together"
        ? togetherExit
          ? TOGETHER_HOLD_T + exitT * (1 - TOGETHER_HOLD_T)
          : togetherHold
            ? TOGETHER_HOLD_T
            : span(p, T.hands, HOLD_PROGRESS) * TOGETHER_HOLD_T
        : 0;
  const isoContent =
    phase === "layers"
      ? 1
      : phase === "together"
        ? 1 - span(ellipseT, TOGETHER_ARRIVE_T, TOGETHER_ISO_GONE_T)
        : 0;
  const handsFade = togetherExit ? 1 - span(exitT, 0, 0.28) : 1;
  const handsArt =
    phase === "together" && togetherHold ? 0.85 * handsFade : 0;
  const handsText =
    phase === "together" && togetherHold ? handsFade : 0;
  const megaRise =
    phase === "action" ? 1 : phase === "together" && togetherExit ? exitT : 0;
  const megaLanded = phase === "action";

  const actionStep = useEnterSteps(phase === "action", ACTION_DELAYS, false);
  const actionHeadline = actionStep >= 1;
  const actionBody = actionStep >= 2;
  const actionCta = actionStep >= 3;
  const ell = ellipseAt(ellipseT);
  const isoPage =
    phase === "layers"
      ? 1
      : phase === "together"
        ? togetherExit
          ? 1 - span(exitT, 0.82, 1)
          : 1
        : 0;
  const ellipseMask =
    phase === "together" && isoPage > 0.01
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

  const openHeadline = showOpenText && (inEarly ? earlyStep < 2 : false);
  const extraBody = inEarly && earlyStep === 1;
  const threatCopyOp = inEarly
    ? earlyStep >= 2
      ? 1
      : 0
    : phase === "distance"
      ? headlineCover *
        (1 - span(moreGrow, 0.12, 0.58)) *
        (1 - span(tallGrow, 0.35, 0.85)) *
        (1 - span(zoomT, 0, 0.1)) *
        (1 - inkFill)
      : 0;
  const threatSubOp = inEarly
    ? earlyStep >= 2
      ? 1
      : 0
    : phase === "distance" && p < T.zoom
      ? Math.max(threatCopyOp, 0) * subCover * (1 - span(moreGrow, 0.05, 0.48))
      : 0;

  return (
    <div
      ref={scrollRef}
      className="landing-story relative h-dvh overflow-y-auto overflow-x-hidden overscroll-none"
      style={{ background: storyBg, fontFamily: "Inter, sans-serif" }}
    >
      <div className="relative" style={{ height: `${STORY_VH}vh` }}>
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div
            className="absolute inset-0 z-0 transition-colors duration-500"
            style={{
              background:
                phase === "map" || phase === "together" || phase === "action"
                  ? GREEN
                  : inkFill > 0.92
                    ? SHADOW_INK
                    : MINT,
            }}
          />

          {(inEarly || ground > 0.01) && (
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 z-[1] pointer-events-none"
              style={{
                opacity: ground,
                height: `${(GROUND_H / FH) * 100}%`,
                background: GREEN,
                transition: "opacity 560ms ease",
              }}
            />
          )}

          <GardenArt src="/landing/art-garden.png" opacity={sceneHome} />
          <GardenArt src="/landing/art-garden-people.png" opacity={scenePeople} />

          {(inEarly || peachOn > 0.01 || shadowOn > 0.01) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
              }}
            >
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
                  transition: "opacity 560ms ease",
                }}
              />
              <img
                src="/landing/art-buildings.png"
                alt=""
                className="absolute z-[2] select-none"
                style={{
                  opacity: shadowOn,
                  right: `${(-SHADOW_ART_DX / FW) * 100}%`,
                  bottom: `${(-SHADOW_ART_DY / FH) * 100}%`,
                  width: `${(PEACH_ART.w / FW) * 100}%`,
                  height: `${(PEACH_ART.h / FH) * 100}%`,
                  objectFit: "contain",
                  objectPosition: "right bottom",
                  transition: "opacity 560ms ease",
                }}
              />
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

          {phase === "map" && (
            <div
              className="absolute inset-0"
              style={{
                background: GREEN,
                opacity: 1,
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
                      transition: "opacity 480ms ease",
                    }}
                  >
                    to make that resilience visible by measuring 4 conditions that help each garden endure.
                  </p>
                </div>
                <div
                  className="relative flex-1 min-h-0"
                  style={{
                    opacity: mapStep >= 3 ? 1 : 0,
                    transform: mapStep >= 3 ? "translateY(0)" : "translateY(28px)",
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

          {(phase === "together" || phase === "action") && (
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
                      const shown = layerStep >= fromBottom + 1;
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
                      const shown = layerStep >= fromBottom + 1;
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

          {phase === "together" && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
              <div
                className="absolute left-6 sm:left-16 top-16 sm:top-24 max-w-4xl z-10"
                style={{ opacity: handsText }}
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

          {(phase === "together" || phase === "action") && megaRise > 0 && (
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
                  style={{
                    fontSize: H2,
                    opacity: 1,
                    transform: "translateY(0)",
                    transition: "opacity 560ms ease, transform 560ms ease",
                  }}
                >
                  they create green space, community, and a living record of neighborhood history
                </p>
              )}
            </div>
          )}

          {(inEarly || phase === "distance") && (
            <h2
              className="absolute z-[6] font-medium tracking-[-0.05em] text-[#2d334a] leading-[1.05]"
              style={{
                left: `${(155 / FW) * 100}%`,
                top: `${(HEADLINE_Y / FH) * 100}%`,
                width: `${(1434 / FW) * 100}%`,
                fontSize: H1,
                opacity: threatCopyOp,
                transition: "opacity 560ms ease",
                pointerEvents: "none",
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
