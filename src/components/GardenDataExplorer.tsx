import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Garden, GardenResilienceScore, GardenVisual, ResilienceLevel } from '../types';
import { GardenMapHandle, GardenNetworkTab } from './GardenNetworkTab';
import { GardenProfileOverlay } from './GardenProfileOverlay';

type ExplorerGarden = Garden & { resilience: GardenResilienceScore };

function gardenSearchLabel(garden: ExplorerGarden): string {
  const zip = garden.zipCode ? `, ${garden.zipCode}` : '';
  return `${garden.name}, New York, NY${zip}`;
}

export const GardenDataExplorer: React.FC<{
  openGardenId?: string | null;
  onOpenReport?: () => void;
}> = ({ openGardenId, onOpenReport }) => {
  const mapRef = useRef<GardenMapHandle>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hoverHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gardens, setGardens] = useState<ExplorerGarden[]>([]);
  const [selectedBorough, setSelectedBorough] = useState('All');
  const [selectedResilience, setSelectedResilience] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewGarden, setPreviewGarden] = useState<ExplorerGarden | null>(null);
  const [hoveredGarden, setHoveredGarden] = useState<ExplorerGarden | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVisuals, setPreviewVisuals] = useState<GardenVisual[]>([]);
  const [cardPoint, setCardPoint] = useState<{ x: number; y: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const cardGarden = profileOpen ? null : hoveredGarden ?? previewGarden;

  const clearHoverHideTimer = () => {
    if (hoverHideTimer.current) {
      clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
  };

  useEffect(() => () => clearHoverHideTimer(), []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBorough !== 'All') params.append('borough', selectedBorough);
    if (selectedResilience !== 'All') params.append('resilienceLevel', selectedResilience);
    if (searchQuery) params.append('search', searchQuery);
    params.append('limit', '2000');

    fetch(`/api/gardens?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setGardens(data.gardens || []))
      .catch((err) => console.error('Failed to fetch gardens:', err));
  }, [selectedBorough, selectedResilience, searchQuery]);

  useEffect(() => {
    if (!openGardenId) return;
    const found = gardens.find((garden) => garden.id === openGardenId || garden.bbl === openGardenId);
    if (found) {
      setPreviewGarden(found);
      setProfileOpen(false);
      mapRef.current?.flyToGarden(found, 16);
      return;
    }
    fetch(`/api/gardens/${openGardenId}`)
      .then((res) => res.json())
      .then((garden) => {
        if (garden?.id && garden.resilience) {
          setPreviewGarden(garden);
          setProfileOpen(false);
          mapRef.current?.flyToGarden(garden, 16);
        }
      })
      .catch((err) => console.error('Failed to open garden from Learn:', err));
  }, [openGardenId, gardens]);

  useEffect(() => {
    const visualGarden = (!profileOpen && hoveredGarden) || previewGarden;
    if (!visualGarden) {
      setPreviewImage(null);
      setPreviewVisuals([]);
      return;
    }
    let cancelled = false;
    const fallback =
      visualGarden.id === 'MGT056' || /elizabeth\s+street/i.test(visualGarden.name)
        ? '/figma-map/esg-header.png'
        : null;

    fetch(`/api/gardens/${encodeURIComponent(visualGarden.id)}/visuals`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const visuals: GardenVisual[] = data.visuals || [];
        setPreviewVisuals(visuals);
        const url = visuals[0]?.thumbUrl || visuals[0]?.url || fallback;
        setPreviewImage(url);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewVisuals([]);
          setPreviewImage(fallback);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileOpen, hoveredGarden?.id, hoveredGarden?.name, previewGarden?.id, previewGarden?.name]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const garden = cardGarden;
    if (!map || !garden?.latitude || !garden?.longitude) {
      setCardPoint(null);
      return;
    }

    const update = () => {
      const point = map.latLngToContainerPoint([garden.latitude, garden.longitude]);
      setCardPoint({ x: point.x, y: point.y });
    };

    update();
    map.on('move zoom moveend zoomend', update);
    return () => {
      map.off('move zoom moveend zoomend', update);
    };
  }, [cardGarden, mapReady, profileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (profileOpen) {
        setProfileOpen(false);
        if (previewGarden) mapRef.current?.flyToGarden(previewGarden, 16);
        return;
      }
      setPreviewGarden(null);
      setHoveredGarden(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileOpen, previewGarden]);

  const controlClass =
    'pointer-events-auto border border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] font-[Inter,sans-serif] text-[18px] md:text-[20px] tracking-[-0.05em]';
  const creamControl = `${controlClass} bg-[#fbf7ff] text-[#3f3f3f]`;

  const searchValue = profileOpen && previewGarden ? gardenSearchLabel(previewGarden) : searchQuery;

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-[#e8e8e8] font-[Inter,sans-serif]">
      <GardenNetworkTab
        ref={mapRef}
        gardens={gardens}
        selectedGardenId={previewGarden?.id ?? hoveredGarden?.id}
        mapLocked={profileOpen}
        spotlightGarden={profileOpen ? previewGarden : null}
        onHoverGarden={(garden) => {
          if (profileOpen || !garden.resilience) return;
          clearHoverHideTimer();
          setHoveredGarden(garden as ExplorerGarden);
        }}
        onUnhoverGarden={() => {
          clearHoverHideTimer();
          hoverHideTimer.current = setTimeout(() => {
            setHoveredGarden(null);
          }, 280);
        }}
        onSelectGarden={(garden) => {
          if (garden.resilience) {
            clearHoverHideTimer();
            setHoveredGarden(null);
            setProfileOpen(false);
            setPreviewGarden(garden as ExplorerGarden);
            mapRef.current?.flyToGarden(garden, 16);
          }
        }}
        onDeselectGarden={() => {
          if (profileOpen) {
            setProfileOpen(false);
            if (previewGarden) mapRef.current?.flyToGarden(previewGarden, 16);
            return;
          }
          setHoveredGarden(null);
          setPreviewGarden(null);
        }}
        onMapReady={(map) => {
          mapInstanceRef.current = map;
          setMapReady(true);
        }}
      />

      <div
        className={`absolute top-6 left-6 right-6 z-[1100] flex flex-wrap items-center gap-3 pointer-events-none ${
          profileOpen ? 'justify-end' : 'justify-between'
        }`}
      >
        {!profileOpen && (
          <>
            <div className={`${creamControl} relative h-[50px] w-[114px] rounded-[10px] shrink-0`}>
              <img src="/figma-map/zoom.svg" alt="" className="absolute inset-0 w-full h-full pointer-events-none" />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="absolute left-0 top-0 h-full w-1/2"
              />
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="absolute right-0 top-0 h-full w-1/2"
              />
            </div>

            <button
              type="button"
              onClick={onOpenReport}
              className={`${creamControl} group rounded-[10px] px-6 py-2 min-w-[280px] text-center hover:bg-[#306a4e] hover:text-[#f5f5f5] transition-colors`}
            >
              <span className="group-hover:hidden">Know Something We Don’t?</span>
              <span className="hidden group-hover:inline">Report</span>
            </button>

            <label className={`${creamControl} rounded-[15px] px-6 py-2 flex items-center gap-4`}>
              <select
                value={selectedResilience}
                onChange={(e) => setSelectedResilience(e.target.value)}
                className="bg-transparent appearance-none pr-2 focus:outline-none cursor-pointer"
              >
                <option value="All">Resilience Levels</option>
                <option value="High Resilience">High Resilience</option>
                <option value="Moderate Resilience">Moderate Resilience</option>
                <option value="Vulnerable">Vulnerable</option>
                <option value="Critical Vulnerability">Critical Vulnerability</option>
              </select>
              <img src="/figma-map/chevron.svg" alt="" className="w-[19px] h-[9px]" />
            </label>

            <label className={`${creamControl} rounded-[15px] px-6 py-2 flex items-center gap-4`}>
              <select
                value={selectedBorough}
                onChange={(e) => setSelectedBorough(e.target.value)}
                className="bg-transparent appearance-none pr-2 focus:outline-none cursor-pointer"
              >
                <option value="All">All Boroughs</option>
                <option value="Manhattan">Manhattan</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Queens">Queens</option>
                <option value="Bronx">Bronx</option>
                <option value="Staten Island">Staten Island</option>
              </select>
              <img src="/figma-map/chevron.svg" alt="" className="w-[19px] h-[9px]" />
            </label>
          </>
        )}

        <label
          className={`${controlClass} group rounded-[15px] pl-8 pr-8 py-2 flex items-center gap-4 min-w-[280px] flex-1 max-w-[520px] ${
            profileOpen
              ? 'bg-[#306a4e] text-[#f3f3f3]'
              : 'bg-[#fbf7ff] text-[#3f3f3f] hover:bg-[#306a4e] focus-within:bg-[#306a4e]'
          }`}
        >
          <img
            src={profileOpen ? '/figma-profile/search-light.svg' : '/figma-map/search.svg'}
            alt=""
            className={`size-6 shrink-0 ${
              profileOpen ? '' : 'group-hover:brightness-0 group-hover:invert group-focus-within:brightness-0 group-focus-within:invert'
            }`}
          />
          <input
            value={searchValue}
            onChange={(e) => {
              if (profileOpen) setProfileOpen(false);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search gardens"
            className={`bg-transparent w-full focus:outline-none placeholder:text-[#3f3f3f] ${
              profileOpen
                ? 'text-[#f3f3f3] placeholder:text-[#f3f3f3]'
                : 'group-hover:placeholder:text-[#f5f5f5] group-focus-within:placeholder:text-[#f5f5f5] group-hover:text-[#f5f5f5] group-focus-within:text-[#f5f5f5]'
            }`}
          />
        </label>
      </div>

      {cardGarden && cardPoint && (
        <GardenThumbnailCard
          garden={cardGarden}
          imageUrl={previewImage}
          x={cardPoint.x}
          y={cardPoint.y}
          onMouseEnter={clearHoverHideTimer}
          onMouseLeave={() => {
            clearHoverHideTimer();
            hoverHideTimer.current = setTimeout(() => {
              setHoveredGarden(null);
            }, 280);
          }}
          onLearnMore={() => {
            clearHoverHideTimer();
            setHoveredGarden(null);
            setPreviewGarden(cardGarden);
            setProfileOpen(true);
            mapRef.current?.flyToGarden(cardGarden, 20, 'profile');
          }}
        />
      )}

      {previewGarden && profileOpen && (
        <GardenProfileOverlay
          garden={previewGarden}
          visuals={previewVisuals}
          map={mapInstanceRef.current}
        />
      )}
    </div>
  );
};

function sashLabel(level: ResilienceLevel): string {
  if (level === 'High Resilience') return 'High';
  if (level === 'Moderate Resilience') return 'Moderate';
  if (level === 'Critical Vulnerability') return 'Critical';
  return 'Vulnerable';
}

function GardenThumbnailCard({
  garden,
  imageUrl,
  x,
  y,
  onLearnMore,
  onMouseEnter,
  onMouseLeave
}: {
  garden: ExplorerGarden;
  imageUrl: string | null;
  x: number;
  y: number;
  onLearnMore: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const level = garden.resilience.resilienceLevel;

  return (
    <div
      className="absolute z-[1100] w-[270px] -translate-x-1/2 -translate-y-[calc(100%+48px)] bg-[#306a4e] border border-[#3f3f3f] rounded-[15px] p-4 flex flex-col gap-4 pointer-events-auto"
      style={{ left: x, top: y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="relative h-[119px] w-full overflow-hidden rounded-[12px] border border-[#3f3f3f]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#254f3a]" />
        )}
        <div className="absolute top-[22px] -right-[36px] w-[246px] rotate-[28deg] bg-[#b32d2d] py-1.5 text-center shadow-[0_4px_2px_rgba(0,0,0,0.4)]">
          <p className="text-[#f5f5f5] text-[15px] tracking-[-0.05em] whitespace-nowrap">{sashLabel(level)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-[#f5f5f5]">
        <div className="flex items-center gap-2">
          <p className="text-[20px] tracking-[-0.05em] leading-tight flex-1">{garden.name}</p>
          <div className="bg-[#b32d2d] border border-[#f5f5f5] rounded-full min-w-[32px] h-8 px-1 flex items-center justify-center shrink-0">
            <span className="text-[15px] tracking-[-0.03em]">{garden.resilience.score}</span>
          </div>
        </div>
        <p className="text-[12px] tracking-[-0.05em]">
          {garden.address}, {garden.borough}
        </p>
      </div>

      <button
        type="button"
        onClick={onLearnMore}
        className="w-full bg-[#f5f5f5] border border-[#3f3f3f] rounded-[15px] py-2 text-[15px] tracking-[-0.05em] text-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] cursor-pointer"
      >
        Learn More
      </button>
    </div>
  );
}
