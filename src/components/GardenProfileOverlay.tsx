import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CategoryEvidence,
  EvidenceBullet,
  Garden,
  GardenResilienceScore,
  GardenVisual,
  PublicAction,
  RecommendedAction,
  ScoreBreakdown,
} from "../types";
import {
  isElizabethStreetGarden,
  lotBoundsForGarden,
} from "../data/gardenPlanOverlays";
import { useMediaQuery } from "../hooks/useMediaQuery";

type ExplorerGarden = Garden & { resilience: GardenResilienceScore };

type ScoreCardId = "policy" | "dev" | "land" | "community";

type Lightbox =
  | { kind: "image"; url: string; alt: string }
  | { kind: "score" }
  | {
      kind: "note";
      tone: "learn" | "action";
      title: string;
      body: string;
      detail?: string;
    };

interface ScoreCardSpec {
  id: ScoreCardId;
  label: string;
  max: number;
  key: keyof Pick<
    ScoreBreakdown,
    | "policySupportScore"
    | "landSecurityScore"
    | "developmentPressureScore"
    | "communityStrengthScore"
  >;
  evidenceKey: keyof CategoryEvidence;
  actionCategory: PublicAction["category"];
  icon: string;
  viz: "drops" | "sun" | "shields" | "people";
}

const SCORE_CARDS: ScoreCardSpec[] = [
  {
    id: "policy",
    label: "Policy Support",
    max: 20,
    key: "policySupportScore",
    evidenceKey: "policy",
    actionCategory: "Low Policy Support",
    icon: "/figma-profile/drop-a.svg",
    viz: "drops",
  },
  {
    id: "dev",
    label: "Development Buffer",
    max: 25,
    key: "developmentPressureScore",
    evidenceKey: "developmentPressure",
    actionCategory: "High Development Pressure",
    icon: "/figma-profile/icon-sun.png",
    viz: "sun",
  },
  {
    id: "land",
    label: "Land Security",
    max: 35,
    key: "landSecurityScore",
    evidenceKey: "landSecurity",
    actionCategory: "Low Land Security",
    icon: "/figma-profile/shield-a.svg",
    viz: "shields",
  },
  {
    id: "community",
    label: "Community",
    max: 20,
    key: "communityStrengthScore",
    evidenceKey: "community",
    actionCategory: "Low Community Strength",
    icon: "/figma-profile/viz-community.svg",
    viz: "people",
  },
];

const ESG_ART: { url: string; alt: string }[] = [
  {
    url: "/figma-profile/esg-art-b.png",
    alt: "Elizabeth Street Garden — lawn and shed",
  },
  {
    url: "/figma-profile/esg-art-a.png",
    alt: "Elizabeth Street Garden — pavilion and garden beds",
  },
];

function categoryPercent(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * 100);
}

function profileImages(
  garden: ExplorerGarden,
  visuals: GardenVisual[],
): { url: string; alt: string }[] {
  if (isElizabethStreetGarden(garden)) return ESG_ART;
  return visuals.slice(0, 2).map((visual) => ({
    url: visual.url,
    alt: visual.title || garden.name,
  }));
}

function bulletLabel(bullet: EvidenceBullet): string {
  if (bullet.effect === "plus") return `${bullet.text} +`;
  if (bullet.effect === "minus") return `${bullet.text} -`;
  return bullet.text;
}

function actionsForCategory(
  garden: ExplorerGarden,
  spec: ScoreCardSpec,
): Array<{ title: string; description: string }> {
  const matched = (garden.resilience.publicActions || []).filter(
    (action) => action.category === spec.actionCategory,
  );
  if (matched.length > 0) {
    return matched.slice(0, 2).map((action) => ({
      title: action.title,
      description: action.description,
    }));
  }

  return (garden.resilience.recommendedActions || [])
    .slice(0, 2)
    .map((action: RecommendedAction) => ({
      title: action.title,
      description: action.description,
    }));
}

export const GardenProfileOverlay: React.FC<{
  garden: ExplorerGarden;
  visuals: GardenVisual[];
  map?: L.Map | null;
}> = ({ garden, visuals, map }) => {
  const [hovered, setHovered] = useState<ScoreCardId | null>(null);
  const [flipped, setFlipped] = useState<ScoreCardId | null>(null);
  const [hoveredBullet, setHoveredBullet] = useState<number | null>(null);
  const [selectedBullet, setSelectedBullet] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const compact = useMediaQuery("(max-width: 1023px)");

  const images = useMemo(
    () => profileImages(garden, visuals),
    [garden, visuals],
  );
  const breakdown = garden.resilience.breakdown;
  const activeSpec = SCORE_CARDS.find((card) => card.id === flipped) || null;
  const remainingCards = flipped
    ? SCORE_CARDS.filter((card) => card.id !== flipped)
    : SCORE_CARDS;
  const bullets = activeSpec
    ? garden.resilience.categoryEvidence[activeSpec.evidenceKey] || []
    : [];
  const activeBullet = selectedBullet !== null ? bullets[selectedBullet] : null;
  const actionCards = activeSpec ? actionsForCategory(garden, activeSpec) : [];

  useEffect(() => {
    setHovered(null);
    setFlipped(null);
    setHoveredBullet(null);
    setSelectedBullet(null);
    setLightbox(null);
  }, [garden.id]);

  useEffect(() => {
    setHoveredBullet(null);
    setSelectedBullet(null);
    setLightbox(null);
  }, [flipped]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox]);

  const closeLightbox = () => setLightbox(null);

  return (
    <>
      <GardenLotCard map={map || null} garden={garden} />

      {images.length > 0 && (
        <div className="hidden lg:block absolute left-6 top-[96px] z-[1200] w-[360px] pointer-events-none">
          {images[1] && (
            <ImageCard
              image={images[1]}
              className="relative w-[360px]"
              onOpen={() => setLightbox({ kind: "image", ...images[1] })}
            />
          )}
          {images[0] && (
            <ImageCard
              image={images[0]}
              className={`relative w-[340px] ${images[1] ? "mt-10" : ""}`}
              onOpen={() => setLightbox({ kind: "image", ...images[0] })}
            />
          )}
        </div>
      )}

      <div
        className={`absolute z-[1200] flex pointer-events-none isolate ${
          compact
            ? "left-3 right-3 bottom-[calc(76px+env(safe-area-inset-bottom))] flex-col items-stretch gap-3 max-h-[min(58dvh,520px)] overflow-y-auto"
            : `right-6 bottom-28 items-end justify-end ${flipped ? "gap-[87px]" : ""}`
        }`}
      >
        {activeSpec && (
          <div className={`relative shrink-0 pointer-events-auto ${compact ? "w-full" : "size-[226px]"}`}>
            {activeBullet && (
              <div
                className={
                  compact
                    ? "relative w-full flex flex-wrap justify-center gap-3 mb-3 pointer-events-none"
                    : "absolute right-[calc(100%+20px)] bottom-0 w-[min(460px,calc(100vw-46rem))] flex flex-wrap-reverse justify-end gap-x-5 gap-y-6 pointer-events-none"
                }
              >
                {actionCards[1] && (
                  <PinnedNote
                    tone="action"
                    title="I will make a difference!"
                    body={actionCards[1].title}
                    detail={actionCards[1].description}
                    onOpen={() =>
                      setLightbox({
                        kind: "note",
                        tone: "action",
                        title: "I will make a difference!",
                        body: actionCards[1].title,
                        detail: actionCards[1].description,
                      })
                    }
                  />
                )}
                {activeBullet.didYouKnow && (
                  <PinnedNote
                    tone="learn"
                    title="Did you know?"
                    body={activeBullet.didYouKnow}
                    onOpen={() =>
                      setLightbox({
                        kind: "note",
                        tone: "learn",
                        title: "Did you know?",
                        body: activeBullet.didYouKnow || "",
                      })
                    }
                  />
                )}
                {actionCards[0] && (
                  <PinnedNote
                    tone="action"
                    title="I will make a difference!"
                    body={actionCards[0].title}
                    detail={actionCards[0].description}
                    onOpen={() =>
                      setLightbox({
                        kind: "note",
                        tone: "action",
                        title: "I will make a difference!",
                        body: actionCards[0].title,
                        detail: actionCards[0].description,
                      })
                    }
                  />
                )}
                {activeBullet.whatItMeans && (
                  <PinnedNote
                    tone="learn"
                    title="What does it mean?"
                    body={activeBullet.whatItMeans}
                    onOpen={() =>
                      setLightbox({
                        kind: "note",
                        tone: "learn",
                        title: "What does it mean?",
                        body: activeBullet.whatItMeans || "",
                      })
                    }
                  />
                )}
              </div>
            )}

            <FlippedScoreCard
              spec={activeSpec}
              bullets={bullets}
              hoveredBullet={hoveredBullet}
              selectedBullet={selectedBullet}
              onHoverBullet={setHoveredBullet}
              onSelectBullet={setSelectedBullet}
              onFocus={() => setLightbox({ kind: "score" })}
              compact={compact}
            />
          </div>
        )}

        <div className={compact ? "grid grid-cols-2 gap-2 sm:gap-3" : "flex items-end"}>
          {remainingCards.map((card, index) => {
            const score = breakdown[card.key];
            const percent = categoryPercent(score, card.max);
            const z = hovered === card.id ? 50 : index + 1;
            return (
              <div
                key={card.id}
                className={`relative shrink-0 pointer-events-auto ${
                  compact ? "w-full min-h-[132px] sm:min-h-[160px]" : "size-[226px]"
                }`}
                style={
                  compact
                    ? undefined
                    : {
                        zIndex: z,
                        marginRight: index === remainingCards.length - 1 ? 0 : -180,
                      }
                }
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() =>
                  setHovered((current) =>
                    current === card.id ? null : current,
                  )
                }
              >
                <button
                  type="button"
                  aria-label={`${card.label} ${percent} percent`}
                  onClick={() => setFlipped(card.id)}
                  className="relative size-full cursor-pointer rounded-[15px] bg-[#d8f6e7] border border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] flex flex-col gap-1 sm:gap-2 items-center justify-center p-2 sm:p-4"
                >
                  <div className={`flex items-center justify-between w-full font-medium text-black tracking-[-0.05em] ${compact ? "text-[12px] sm:text-[14px] flex-wrap gap-x-1" : "text-[15px] whitespace-nowrap"}`}>
                    <p>{card.label}</p>
                    <p>{percent}%</p>
                  </div>
                  <div className={compact ? "scale-[0.62] sm:scale-75 origin-center -my-4" : ""}>
                    <ScoreViz spec={card} score={score} />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[3000] bg-black/45 backdrop-blur-[6px] flex items-center justify-center p-4 sm:p-8"
          onClick={closeLightbox}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={closeLightbox}
            className="absolute top-6 right-6 size-11 rounded-[10px] bg-[#fbf7ff] border border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] text-[#3f3f3f] text-2xl leading-none"
          >
            ×
          </button>
          {lightbox.kind === "image" && (
            <img
              src={lightbox.url}
              alt={lightbox.alt}
              className="max-h-[82vh] max-w-[82vw] object-contain rounded-[15px] border-2 border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] brightness-[0.92]"
            />
          )}
          {lightbox.kind === "score" && activeSpec && (
            <div onClick={(event) => event.stopPropagation()}>
              <FlippedScoreCard
                spec={activeSpec}
                bullets={bullets}
                hoveredBullet={hoveredBullet}
                selectedBullet={selectedBullet}
                onHoverBullet={setHoveredBullet}
                onSelectBullet={setSelectedBullet}
                focused
              />
            </div>
          )}
          {lightbox.kind === "note" && (
            <div onClick={(event) => event.stopPropagation()}>
              <PinnedNote
                tone={lightbox.tone}
                title={lightbox.title}
                body={lightbox.body}
                detail={lightbox.detail}
                focused
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

function FlippedScoreCard({
  spec,
  bullets,
  hoveredBullet,
  selectedBullet,
  onHoverBullet,
  onSelectBullet,
  onFocus,
  focused = false,
  compact = false,
}: {
  spec: ScoreCardSpec;
  bullets: EvidenceBullet[];
  hoveredBullet: number | null;
  selectedBullet: number | null;
  onHoverBullet: (index: number | null) => void;
  onSelectBullet: (index: number) => void;
  onFocus?: () => void;
  focused?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        focused
          ? `${spec.label} details`
          : `${spec.label} details. Click the card to zoom.`
      }
      onClick={focused ? undefined : onFocus}
      onKeyDown={(event) => {
        if (focused || !onFocus) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocus();
        }
      }}
      className={`relative rounded-[15px] bg-[#d8f6e7] border-2 border-black shadow-[4px_4px_0_0_#3f3f3f] cursor-pointer ${
        focused
          ? "w-[min(92vw,480px)] min-h-[min(82vh,520px)] p-6 brightness-[0.97]"
          : compact
            ? "w-full min-h-[200px] p-3"
            : "size-[226px] p-[11px]"
      }`}
    >
      <img
        src="/figma-profile/pin-card.svg"
        alt=""
        className={`absolute left-1/2 -translate-x-1/2 pointer-events-none ${
          focused ? "-top-4 w-4 h-7" : "-top-3 w-[13px] h-[23px]"
        }`}
      />
      <div
        className={`flex flex-col h-full items-start ${focused ? "gap-6" : "gap-4"}`}
      >
        <div className="flex gap-[26px] items-start w-full">
          <p
            className={`font-medium text-black whitespace-nowrap ${focused ? "text-[22px]" : "text-[15px]"}`}
          >
            {spec.label}
          </p>
          <div
            className={`relative shrink-0 overflow-hidden ${focused ? "size-7" : "size-[18px]"}`}
          >
            <img src={spec.icon} alt="" className="size-full object-cover" />
          </div>
        </div>
        <div
          className={`w-full flex-1 overflow-y-auto tracking-[-0.05em] text-black ${
            focused ? "text-[16px]" : "text-[12px]"
          }`}
        >
          {bullets.length === 0 ? (
            <p>No evidence lines for this category yet.</p>
          ) : (
            bullets.map((bullet, index) => {
              const active =
                hoveredBullet === index || selectedBullet === index;
              return (
                <p
                  key={`${bullet.text}-${index}`}
                  onMouseEnter={() => onHoverBullet(index)}
                  onMouseLeave={() => onHoverBullet(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBullet(index);
                  }}
                  className={`leading-normal last:mb-0 cursor-pointer ${
                    focused ? "mb-4" : "mb-[10px]"
                  } ${active ? "bg-[#fff5db]" : "bg-transparent"}`}
                >
                  {bulletLabel(bullet)}
                </p>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PinnedNote({
  className,
  tone,
  title,
  body,
  detail,
  onOpen,
  focused = false,
}: {
  className?: string;
  tone: "learn" | "action";
  title: string;
  body: string;
  detail?: string;
  onOpen?: () => void;
  focused?: boolean;
}) {
  const background = tone === "learn" ? "bg-[#faf3db]" : "bg-[#d2d1ff]";
  return (
    <button
      type="button"
      onClick={focused ? undefined : onOpen}
      className={`${className || "relative"} text-left ${
        focused
          ? "w-[min(92vw,480px)] pointer-events-auto"
          : "w-[min(219px,calc(50vw-1.25rem))] pointer-events-auto cursor-pointer"
      }`}
    >
      <img
        src="/figma-profile/pin-card.svg"
        alt=""
        className={`absolute left-1/2 -translate-x-1/2 ${
          focused ? "-top-4 w-4 h-7" : "-top-3 w-[13px] h-[23px]"
        }`}
      />
      <div
        className={`${background} border-2 border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] ${
          focused
            ? "mt-4 min-h-[min(70vh,480px)] rounded-[20px] px-8 pt-8 pb-6 brightness-[0.97]"
            : "mt-3 aspect-square w-full max-w-[219px] rounded-[20px] px-5 pt-5 pb-4 overflow-hidden"
        }`}
      >
        <p
          className={`font-medium text-black leading-normal ${focused ? "text-[22px]" : "text-[15px]"}`}
        >
          {title}
        </p>
        <p
          className={`tracking-[-0.05em] text-black leading-normal ${
            focused ? "mt-8 text-[16px]" : "mt-5 text-[12px]"
          }`}
        >
          {body}
        </p>
        {detail && (
          <p
            className={`tracking-[-0.05em] text-black leading-normal ${
              focused ? "mt-4 text-[16px]" : "mt-2 text-[12px]"
            }`}
          >
            {detail}
          </p>
        )}
      </div>
    </button>
  );
}

function GardenLotCard({
  map,
  garden,
}: {
  map: L.Map | null;
  garden: ExplorerGarden;
}) {
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!map) return;
    const bounds = lotBoundsForGarden(garden);
    if (!bounds) return;

    const sync = () => {
      const [[south, west], [north, east]] = bounds;
      const sw = map.latLngToContainerPoint([south, west]);
      const ne = map.latLngToContainerPoint([north, east]);
      const width = Math.abs(ne.x - sw.x);
      const height = Math.abs(ne.y - sw.y);
      if (width < 8 || height < 8) return;
      setRect({
        left: Math.min(sw.x, ne.x),
        top: Math.min(sw.y, ne.y),
        width,
        height,
      });
    };

    map.on("move zoom moveend zoomend", sync);
    sync();
    const timers = [40, 200, 750].map((ms) => window.setTimeout(sync, ms));
    return () => {
      map.off("move zoom moveend zoomend", sync);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [map, garden]);

  if (!rect) return null;

  return (
    <>
      <div className="absolute inset-0 z-[1080] pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-[15px] border-2 border-[#3f3f3f]"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            boxShadow:
              "4px 4px 0 0 #3f3f3f, 0 0 0 9999px rgba(232, 232, 232, 0.82)",
          }}
        />
      </div>
      <img
        src="/figma-profile/pin-card.svg"
        alt=""
        className="absolute z-[1090] w-[13px] h-[23px] pointer-events-none -translate-x-1/2"
        style={{ left: rect.left + rect.width / 2, top: rect.top - 20 }}
      />
    </>
  );
}

function ImageCard({
  image,
  className,
  onOpen,
}: {
  image: { url: string; alt: string };
  className: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${className} relative pointer-events-auto cursor-pointer`}
    >
      <img
        src="/figma-profile/pin-card.svg"
        alt=""
        className="absolute left-1/2 -translate-x-1/2 -top-2 w-3 h-5 z-10"
      />
      <div className="mt-2 aspect-[4/3] w-full overflow-hidden rounded-[15px] border-2 border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f]">
        <img
          src={image.url}
          alt={image.alt}
          className="size-full object-cover"
        />
      </div>
    </button>
  );
}

function ScoreViz({ spec, score }: { spec: ScoreCardSpec; score: number }) {
  if (spec.viz === "drops") {
    return (
      <IconMeter
        count={20}
        columns={5}
        fillCount={(score / spec.max) * 20}
        filledSrc="/figma-profile/drop-a.svg"
        emptySrc="/figma-profile/drop-b.svg"
        columnMajor
        className="grid gap-[6px] h-[144px] w-[163px] px-[3px] py-[5px]"
      />
    );
  }
  if (spec.viz === "shields") {
    return (
      <IconMeter
        count={9}
        columns={3}
        fillCount={(score / spec.max) * 9}
        filledSrc="/figma-profile/shield-a.svg"
        emptySrc="/figma-profile/shield-b.svg"
        className="grid gap-x-4 gap-y-2 h-[157px] w-[168px]"
      />
    );
  }
  if (spec.viz === "sun") {
    return (
      <div className="relative h-[172px] w-[170px]">
        <img
          src="/figma-profile/viz-dev.svg"
          alt=""
          className="absolute inset-0 size-full"
        />
      </div>
    );
  }
  return (
    <div className="relative h-[162px] w-[152px]">
      <img
        src="/figma-profile/viz-community.svg"
        alt=""
        className="absolute inset-0 size-full"
      />
    </div>
  );
}

function IconMeter({
  count,
  columns,
  fillCount,
  filledSrc,
  emptySrc,
  columnMajor = false,
  className,
}: {
  count: number;
  columns: number;
  fillCount: number;
  filledSrc: string;
  emptySrc: string;
  columnMajor?: boolean;
  className: string;
}) {
  const rows = Math.ceil(count / columns);
  return (
    <div
      className={className}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / columns);
        const col = i % columns;
        const fillIndex = columnMajor ? col * rows + row : i;
        const fill = Math.min(1, Math.max(0, fillCount - fillIndex));
        return (
          <div key={i} className="relative min-h-0 min-w-0">
            <img src={emptySrc} alt="" className="size-full" />
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }}
              >
                <img src={filledSrc} alt="" className="size-full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
