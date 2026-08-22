import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Garden, GardenResilienceScore } from "../types";
import {
  GardenPlanOverlay,
  lotBoundsForGarden,
} from "../data/gardenPlanOverlays";
import { gardenShowsPhotoPin } from "../data/gardensWithVisuals";

type EnrichedGarden = Garden & { resilience?: GardenResilienceScore };

export interface GardenMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyToGarden: (
    garden: EnrichedGarden,
    zoom?: number,
    placement?: "center" | "profile",
  ) => void;
}

export interface GardenNetworkTabProps {
  gardens?: EnrichedGarden[];
  onSelectGarden?: (garden: EnrichedGarden) => void;
  onHoverGarden?: (garden: EnrichedGarden) => void;
  onUnhoverGarden?: () => void;
  onDeselectGarden?: () => void;
  selectedGardenId?: string | null;
  onMapReady?: (map: L.Map) => void;
  planOverlay?: GardenPlanOverlay | null;
  mapLocked?: boolean;
  spotlightGarden?: EnrichedGarden | null;
}

function pinIcon(hasVisuals: boolean) {
  if (hasVisuals) {
    return L.icon({
      iconUrl: "/figma-map/pin.svg",
      iconSize: [22, 42],
      iconAnchor: [11, 42],
      className: "garden-pin garden-pin--photo",
    });
  }
  return L.icon({
    iconUrl: "/figma-map/pin.svg",
    iconSize: [10, 19],
    iconAnchor: [5, 19],
    className: "garden-pin garden-pin--plain",
  });
}

export const GardenNetworkTab = forwardRef<
  GardenMapHandle,
  GardenNetworkTabProps
>(
  (
    {
      gardens = [],
      onSelectGarden,
      onHoverGarden,
      onUnhoverGarden,
      onDeselectGarden,
      selectedGardenId,
      onMapReady,
      planOverlay,
      mapLocked = false,
    },
    ref,
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<L.Map | null>(null);
    const gardenLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const planLayerRef = useRef<L.ImageOverlay | null>(null);
    const pointerDownRef = useRef<L.Point | null>(null);
    const selectRef = useRef(onSelectGarden);
    const hoverRef = useRef(onHoverGarden);
    const unhoverRef = useRef(onUnhoverGarden);
    const deselectRef = useRef(onDeselectGarden);
    selectRef.current = onSelectGarden;
    hoverRef.current = onHoverGarden;
    unhoverRef.current = onUnhoverGarden;
    deselectRef.current = onDeselectGarden;

    useImperativeHandle(ref, () => ({
      zoomIn: () => leafletMapRef.current?.zoomIn(),
      zoomOut: () => leafletMapRef.current?.zoomOut(),
      flyToGarden: (garden, zoom = 16, placement = "center") => {
        const map = leafletMapRef.current;
        if (!map || !garden.latitude || !garden.longitude) return;
        const latlng = L.latLng(garden.latitude, garden.longitude);
        if (placement !== "profile") {
          map.flyTo(latlng, zoom, { duration: 0.65 });
          return;
        }

        const bounds = lotBoundsForGarden(garden);
        if (!bounds) {
          const size = map.getSize();
          const gardenScreen = L.point(size.x * 0.62, size.y * 0.42);
          const projected = map.project(latlng, zoom);
          const centerPoint = projected.subtract(
            gardenScreen.subtract(size.divideBy(2)),
          );
          map.flyTo(map.unproject(centerPoint, zoom), zoom, { duration: 0.7 });
          return;
        }

        const size = map.getSize();
        const compact = size.x < 900;
        const padTop = compact ? 88 : 108;
        const padRight = compact ? 16 : 24;
        const padBottom = compact
          ? Math.min(340, Math.max(240, size.y * 0.52))
          : Math.min(360, Math.max(250, size.y * 0.42));
        const rightSlot = compact
          ? Math.min(size.x - 32, size.x * 0.92)
          : Math.min(420, Math.max(260, size.x * 0.32));
        const padLeft = compact ? 16 : Math.max(48, size.x - padRight - rightSlot);
        const innerW = size.x - padLeft - padRight;
        const innerH = size.y - padTop - padBottom;
        map.flyToBounds(bounds, {
          paddingTopLeft: L.point(innerW > 80 ? padLeft : 48, padTop),
          paddingBottomRight: L.point(padRight, innerH > 80 ? padBottom : 200),
          maxZoom: 20,
          duration: 0.7,
        });
      },
    }));

    useEffect(() => {
      if (!mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [40.72, -73.995],
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
        maxZoom: 20,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      map.createPane("gardenPlan");
      const planPane = map.getPane("gardenPlan");
      if (planPane) {
        planPane.style.zIndex = "450";
        planPane.style.pointerEvents = "none";
      }

      const layerGroup = L.layerGroup().addTo(map);
      gardenLayerGroupRef.current = layerGroup;
      leafletMapRef.current = map;
      onMapReady?.(map);

      map.on("mousedown", (event) => {
        pointerDownRef.current = event.containerPoint;
      });
      map.on("click", (event) => {
        const down = pointerDownRef.current;
        pointerDownRef.current = null;
        if (down && event.containerPoint.distanceTo(down) > 6) return;
        deselectRef.current?.();
      });

      const resize = () => map.invalidateSize();
      requestAnimationFrame(resize);
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
        map.remove();
        leafletMapRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = leafletMapRef.current;
      if (!map) return;

      const handlers = [
        map.dragging,
        map.touchZoom,
        map.doubleClickZoom,
        map.scrollWheelZoom,
        map.boxZoom,
        map.keyboard,
      ];

      if (mapLocked) {
        handlers.forEach((handler) => handler.disable());
        map.getContainer().style.cursor = "default";
      } else {
        handlers.forEach((handler) => handler.enable());
        map.getContainer().style.cursor = "";
      }
    }, [mapLocked]);

    useEffect(() => {
      const map = leafletMapRef.current;
      if (!map) return;

      planLayerRef.current?.remove();
      planLayerRef.current = null;

      if (!planOverlay) return;

      const overlay = L.imageOverlay(planOverlay.url, planOverlay.bounds, {
        opacity: 1,
        className: "esg-plan-overlay",
        interactive: false,
        pane: "gardenPlan",
      }).addTo(map);
      planLayerRef.current = overlay;

      return () => {
        overlay.remove();
        if (planLayerRef.current === overlay) planLayerRef.current = null;
      };
    }, [planOverlay]);

    useEffect(() => {
      const layerGroup = gardenLayerGroupRef.current;
      if (!layerGroup) return;
      layerGroup.clearLayers();

      gardens.forEach((garden) => {
        if (!garden.latitude || !garden.longitude) return;
        if (mapLocked) return;
        const hasVisuals = gardenShowsPhotoPin(garden);
        const marker = L.marker([garden.latitude, garden.longitude], {
          icon: pinIcon(hasVisuals),
          zIndexOffset:
            (hasVisuals ? 250 : 0) + (selectedGardenId === garden.id ? 500 : 0),
        });

        marker.on("mouseover", () => {
          hoverRef.current?.(garden);
        });
        marker.on("mouseout", () => {
          unhoverRef.current?.();
        });
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          selectRef.current?.(garden);
        });
        layerGroup.addLayer(marker);
      });
    }, [gardens, selectedGardenId, mapLocked]);

    return (
      <div className="absolute inset-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>
    );
  },
);

GardenNetworkTab.displayName = "GardenNetworkTab";
