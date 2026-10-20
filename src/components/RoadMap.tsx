import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Tooltip,
  Popup,
  Marker,
  Rectangle,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Database,
  RefreshCw,
  Crosshair,
  Layers,
  MapPin,
  Compass,
  Activity,
  AlertTriangle,
  Info,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  Droplets,
  CloudRain,
  RotateCcw,
  ShieldAlert,
  Hospital as HospitalIcon,
  AlertOctagon,
  Navigation,
  Scan,
  Maximize2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Square,
  Play,
} from "lucide-react";
import { getRoadSpeed, getRoadCapacity } from "../simulation/graph";
import { getUtilizationColor, getCongestionLevel } from "../simulation/traffic";
import {
  FLOOD_HOTSPOTS,
  getEffectiveRadius,
} from "../data/floodHotspots";
import {
  WhatIfScenarioResult,
  FloodHotspot,
  RainfallLevel,
} from "../simulation/whatIfEngine";
import {
  HospitalAccessAnalysisResult,
  DemandNodeAccess,
} from "../simulation/hospitalAccessibilityEngine";
import LocationSearch from "./LocationSearch";
import { calculateAreaKm2 } from "../utils/geo";

// Zone coordinates: Central Delhi (Connaught Place, Minto Bridge, ITO, Tilak Bridge)
export const ZONE_BOUNDS: [[number, number], [number, number]] = [
  [28.6150, 77.2050],
  [28.6480, 77.2500],
];

export const ZONE_CENTER: [number, number] = [28.6315, 77.2270];

export function isValidBbox(south: any, west: any, north: any, east: any): boolean {
  return (
    typeof south === "number" &&
    typeof west === "number" &&
    typeof north === "number" &&
    typeof east === "number" &&
    Number.isFinite(south) &&
    Number.isFinite(west) &&
    Number.isFinite(north) &&
    Number.isFinite(east) &&
    south < north &&
    west < east
  );
}

function MapBoundsController({
  bounds,
  loading,
  resetTrigger = 0,
  panelState,
}: {
  bounds: [[number, number], [number, number]];
  loading?: boolean;
  resetTrigger?: number;
  panelState?: any;
}) {
  const map = useMap();
  const location = useLocation();

  // Helper to call map.fitBounds on the zone bounds with padding [40, 40] and maxZoom 14
  const applyFitBounds = useCallback(() => {
    if (!map) return;
    try {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch (e) {
      console.warn("fitBounds error:", e);
    }
  }, [map, bounds]);

  // Set the map's minZoom to 12
  useEffect(() => {
    if (!map) return;
    map.setMinZoom(12);
  }, [map]);

  // When the zone or area loads, call map.fitBounds on the zone bounds with padding [40, 40] and maxZoom 14
  useEffect(() => {
    if (!map) return;
    applyFitBounds();
  }, [map, applyFitBounds, loading]);

  // When panel opens, closes, or switches, invalidateSize and fitBounds after layout reflow
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    applyFitBounds();

    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      applyFitBounds();
    });

    const t1 = setTimeout(() => {
      map.invalidateSize();
      applyFitBounds();
    }, 100);

    const t2 = setTimeout(() => {
      map.invalidateSize();
      applyFitBounds();
    }, 250);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, applyFitBounds, panelState]);

  // Call invalidateSize after mount, and call fitBounds again after invalidateSize()
  // Also re-fit when the user clicks "Reset" or "Change area" and returns (location.key changes or resetTrigger increments)
  useEffect(() => {
    if (!map) return;

    // Call fitBounds initially
    applyFitBounds();

    // Call invalidateSize after mount, and call fitBounds again after invalidateSize()
    map.invalidateSize();
    applyFitBounds();

    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      applyFitBounds();
    });

    const t1 = setTimeout(() => {
      map.invalidateSize();
      applyFitBounds();
    }, 100);

    const t2 = setTimeout(() => {
      map.invalidateSize();
      applyFitBounds();
    }, 300);

    const handleResize = () => {
      map.invalidateSize();
      applyFitBounds();
    };

    window.addEventListener("resize", handleResize);

    // ResizeObserver on the Leaflet container to catch layout transitions smoothly
    const container = map.getContainer();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
        applyFitBounds();
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [map, applyFitBounds, location.key, resetTrigger]);

  return null;
}

export function getRoadHierarchyColor(highway: string): string {
  const clean = String(highway || "").toLowerCase().split("_")[0];
  switch (clean) {
    case "motorway":
      return "#c084fc"; // purple
    case "trunk":
      return "#fb7185"; // rose
    case "primary":
      return "#38bdf8"; // sky blue
    case "secondary":
      return "#22d3ee"; // cyan
    case "tertiary":
      return "#34d399"; // emerald
    case "residential":
    default:
      return "#94a3b8"; // slate
  }
}

export function getRoadHierarchyWeight(highway: string): number {
  const clean = String(highway || "").toLowerCase().split("_")[0];
  if (clean === "motorway" || clean === "trunk") return 4.5;
  if (clean === "primary") return 3.5;
  if (clean === "secondary") return 2.8;
  return 2.0;
}

// Red cross hospital marker icon (for trauma hospitals)
const hospitalIcon = L.divIcon({
  className: "custom-hospital-marker",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#dc2626;border:2px solid #ffffff;border-radius:50%;color:#ffffff;font-family:monospace;font-size:15px;font-weight:900;box-shadow:0 0 12px rgba(220,38,38,0.85);cursor:pointer;" title="Trauma Emergency Hospital"><span style="transform:translateY(-1px);">+</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Specialty hospital marker icon (purple/indigo star icon for specialty non-emergency hospitals like Guru Nanak Eye Centre)
const specialtyHospitalIcon = L.divIcon({
  className: "custom-specialty-hospital-marker",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#6366f1;border:2px solid #ffffff;border-radius:50%;color:#ffffff;font-family:sans-serif;font-size:12px;font-weight:900;box-shadow:0 0 10px rgba(99,102,241,0.85);cursor:pointer;" title="specialty, not an emergency destination"><span style="transform:translateY(0px);">✦</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapFlyHandler({
  target,
  onTargetConsumed,
}: {
  target: { center?: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null;
  onTargetConsumed: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target || !map) return;
    if (target.bounds) {
      map.fitBounds(target.bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (target.center) {
      map.flyTo(target.center, target.zoom || 14, { duration: 1.2 });
    }
    onTargetConsumed();
  }, [target, map, onTargetConsumed]);
  return null;
}

function MapBoundsExtractor({ onRegisterExtract }: { onRegisterExtract: (fn: () => [[number, number], [number, number]]) => void }) {
  const map = useMap();
  useEffect(() => {
    onRegisterExtract(() => {
      const b = map.getBounds();
      return [
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getEast()],
      ];
    });
  }, [map, onRegisterExtract]);
  return null;
}

function MapAreaDrawInteraction({
  isDrawingMode,
  onBoundsChange,
  onDrawingComplete,
}: {
  isDrawingMode: boolean;
  onBoundsChange: (bounds: [[number, number], [number, number]]) => void;
  onDrawingComplete: () => void;
}) {
  const map = useMap();
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
  const [currentDrag, setCurrentDrag] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (!map) return;
    if (isDrawingMode) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.getContainer().style.cursor = "";
      setDragStart(null);
      setCurrentDrag(null);
    }
  }, [isDrawingMode, map]);

  useEffect(() => {
    if (!map || !isDrawingMode) return;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      setDragStart(e.latlng);
      setCurrentDrag(e.latlng);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (dragStart) {
        setCurrentDrag(e.latlng);
      }
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (dragStart) {
        const p1 = dragStart;
        const p2 = e.latlng;
        const south = Math.min(p1.lat, p2.lat);
        const north = Math.max(p1.lat, p2.lat);
        const west = Math.min(p1.lng, p2.lng);
        const east = Math.max(p1.lng, p2.lng);

        if (Math.abs(north - south) > 0.001 && Math.abs(east - west) > 0.001) {
          onBoundsChange([[south, west], [north, east]]);
          onDrawingComplete();
        }
        setDragStart(null);
        setCurrentDrag(null);
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [map, isDrawingMode, dragStart, onBoundsChange, onDrawingComplete]);

  if (isDrawingMode && dragStart && currentDrag) {
    const s = Math.min(dragStart.lat, currentDrag.lat);
    const n = Math.max(dragStart.lat, currentDrag.lat);
    const w = Math.min(dragStart.lng, currentDrag.lng);
    const e = Math.max(dragStart.lng, currentDrag.lng);
    return (
      <Rectangle
        bounds={[[s, w], [n, e]]}
        pathOptions={{
          color: "#f59e0b",
          weight: 2,
          dashArray: "6 4",
          fillColor: "#f59e0b",
          fillOpacity: 0.25,
        }}
      />
    );
  }

  return null;
}

export interface ActiveZone {
  name: string;
  south: number;
  west: number;
  north: number;
  east: number;
  center: [number, number];
  isDefault: boolean;
  areaKm2: number;
}

export interface RoadMapProps {
  roads: any[];
  hospitals: any[];
  graph: any;
  dataSource: "OSM live" | "fallback snapshot";
  loading: boolean;
  loadingMessage?: string;
  onRefresh: () => void;
  selectedRoadId?: string | null;
  onSelectRoad?: (road: any) => void;
  baselineTraffic?: any;
  odPairs?: any[];
  // Zone & Area Selection Props
  currentZone?: ActiveZone;
  onRunAnalysisArea?: (bounds: [[number, number], [number, number]], name?: string) => void;
  onResetToCentralDelhi?: () => void;
  resetTrigger?: number;
  fetchError?: string | null;
  onRetryAnalysis?: () => void;
  // What-If & Cascade Props
  whatIfScenario?: WhatIfScenarioResult | null;
  closedRoadIds?: Set<string>;
  onToggleRoadClosed?: (roadId: string) => void;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string | null) => void;
  selectedHotspotIds?: string[];
  onToggleHotspot?: (hotspotId: string) => void;
  rainfallLevel?: RainfallLevel;
  activeTab?: string;
  cascadeStepIndex?: number;
  onResetClosures?: () => void;
  // Hospital Access Props
  hospitalAccess?: HospitalAccessAnalysisResult | null;
  selectedHospitalAreaId?: string | null;
  onSelectHospitalArea?: (areaId: string | null) => void;
  showHospitalNodes?: boolean;
  onToggleHospitalNodes?: () => void;
  // Map Layer Controls
  mapMode?: MapMode;
  onSetMapMode?: (mode: MapMode) => void;
  showHotspotCircles?: boolean;
  onToggleHotspots?: () => void;
  panelState?: any;
}

export type MapMode = "utilization" | "hierarchy";

export default function RoadMap({
  roads,
  hospitals,
  graph,
  dataSource,
  loading,
  loadingMessage,
  onRefresh,
  selectedRoadId,
  onSelectRoad,
  baselineTraffic,
  odPairs = [],
  whatIfScenario = null,
  closedRoadIds = new Set(),
  onToggleRoadClosed,
  selectedHotspotId = null,
  onSelectHotspot,
  selectedHotspotIds = [],
  onToggleHotspot,
  rainfallLevel = "Extreme",
  activeTab = "what_if",
  cascadeStepIndex = 2,
  onResetClosures,
  hospitalAccess = null,
  selectedHospitalAreaId = null,
  onSelectHospitalArea,
  showHospitalNodes = true,
  onToggleHospitalNodes,
  currentZone,
  onRunAnalysisArea,
  onResetToCentralDelhi,
  resetTrigger = 0,
  fetchError = null,
  onRetryAnalysis,
  mapMode: propMapMode,
  onSetMapMode,
  showHotspotCircles: propShowHotspotCircles,
  onToggleHotspots,
  panelState,
}: RoadMapProps) {
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [internalShowHotspotCircles, setInternalShowHotspotCircles] = useState<boolean>(true);
  const [internalMapMode, setInternalMapMode] = useState<MapMode>("utilization");
  const [localShowHospitalNodes, setLocalShowHospitalNodes] = useState<boolean>(true);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isGoldenHourDismissed, setIsGoldenHourDismissed] = useState<boolean>(false);

  const showHotspotCircles = propShowHotspotCircles !== undefined ? propShowHotspotCircles : internalShowHotspotCircles;
  const mapMode = propMapMode !== undefined ? propMapMode : internalMapMode;
  const setMapMode = onSetMapMode || setInternalMapMode;
  const toggleHotspots = onToggleHotspots || (() => setInternalShowHotspotCircles((v) => !v));

  // Validate currentZone bbox (finite numbers, south < north, west < east).
  // If invalid, fall back to Central Delhi default bounds and warn.
  const { validBounds, isBboxValid } = useMemo(() => {
    if (
      currentZone &&
      isValidBbox(currentZone.south, currentZone.west, currentZone.north, currentZone.east)
    ) {
      return {
        validBounds: [
          [currentZone.south, currentZone.west],
          [currentZone.north, currentZone.east],
        ] as [[number, number], [number, number]],
        isBboxValid: true,
      };
    }
    return {
      validBounds: ZONE_BOUNDS,
      isBboxValid: !currentZone || currentZone.isDefault,
    };
  }, [currentZone]);

  // Log warning if invalid bounding box detected
  useEffect(() => {
    if (currentZone && !isBboxValid) {
      console.warn(
        "Invalid bounding box detected in AppStateContext, falling back to default Central Delhi bounds:",
        {
          south: currentZone.south,
          west: currentZone.west,
          north: currentZone.north,
          east: currentZone.east,
        }
      );
    }
  }, [currentZone, isBboxValid]);

  const activeZoneCenter: [number, number] = useMemo(() => {
    if (
      isBboxValid &&
      currentZone?.center &&
      Number.isFinite(currentZone.center[0]) &&
      Number.isFinite(currentZone.center[1])
    ) {
      return currentZone.center;
    }
    return ZONE_CENTER;
  }, [currentZone, isBboxValid]);

  // Key based on area bbox so MapContainer re-initializes cleanly on changes/revisits
  const mapKey = useMemo(() => {
    return `dashboard-map-${validBounds[0][0].toFixed(5)}-${validBounds[0][1].toFixed(5)}-${validBounds[1][0].toFixed(5)}-${validBounds[1][1].toFixed(5)}`;
  }, [validBounds]);

  const nodeCount = useMemo(() => {
    return Object.keys(graph?.nodes || {}).length;
  }, [graph]);

  // Requirement 6: console.log bbox, roads returned, and hospitals returned when analysis runs
  useEffect(() => {
    if (currentZone) {
      console.log(
        "Dashboard map active area bbox:",
        {
          south: currentZone.south,
          west: currentZone.west,
          north: currentZone.north,
          east: currentZone.east,
        },
        `Roads returned: ${roads.length}, Hospitals returned: ${hospitals.length}`
      );
    }
  }, [currentZone, roads.length, hospitals.length]);

  // Visible Hotspots: only hotspots from floodHotspots.js that fall inside the valid box are shown
  const visibleHotspots = useMemo(() => {
    const s = validBounds[0][0];
    const w = validBounds[0][1];
    const n = validBounds[1][0];
    const e = validBounds[1][1];
    return FLOOD_HOTSPOTS.filter(
      (h) => h.lat >= s && h.lat <= n && h.lon >= w && h.lon <= e
    );
  }, [validBounds]);

  // Area Selection States
  const [isAreaSelectMode, setIsAreaSelectMode] = useState<boolean>(false);
  const [isDrawingRectangle, setIsDrawingRectangle] = useState<boolean>(false);
  const [selectedAreaBounds, setSelectedAreaBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    center?: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState<boolean>(true);

  // Getter for current map viewport bounds
  const extractBoundsRef = useRef<(() => [[number, number], [number, number]]) | null>(null);

  const selectedAreaKm2 = useMemo(() => {
    if (!selectedAreaBounds) return 0;
    return calculateAreaKm2(selectedAreaBounds);
  }, [selectedAreaBounds]);

  const isAreaTooLarge = selectedAreaKm2 > 25.0;
  const isAreaTooSmall = selectedAreaKm2 > 0 && selectedAreaKm2 < 0.3;
  const isAreaValid = Boolean(selectedAreaBounds && !isAreaTooLarge && !isAreaTooSmall);

  // Handle "Use current view"
  const handleUseCurrentView = useCallback(() => {
    if (extractBoundsRef.current) {
      const b = extractBoundsRef.current();
      setSelectedAreaBounds(b);
      setIsDrawingRectangle(false);
    }
  }, []);

  // Handle Location Search selection
  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string, bbox?: [number, number, number, number]) => {
      if (bbox) {
        setFlyTarget({ bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]] });
      } else {
        setFlyTarget({ center: [lat, lon], zoom: 14 });
      }
    },
    []
  );

  // Handle Run Analysis on selected area
  const handleRunAnalysis = useCallback(() => {
    if (!selectedAreaBounds || !isAreaValid) return;
    if (onRunAnalysisArea) {
      onRunAnalysisArea(selectedAreaBounds);
      setIsAreaSelectMode(false);
      setSelectedAreaBounds(null);
      setIsDrawingRectangle(false);
    }
  }, [selectedAreaBounds, isAreaValid, onRunAnalysisArea]);

  // Active hospital nodes visibility
  const isHospitalLayerVisible =
    activeTab === "hospital_access" ? true : localShowHospitalNodes;

  const validRoads = useMemo(() => {
    return roads.filter(
      (r) =>
        r &&
        Array.isArray(r.geometry) &&
        r.geometry.length > 1 &&
        r.geometry.every(
          (pt: any) =>
            Number.isFinite(Number(pt.lat)) && Number.isFinite(Number(pt.lon))
        )
    );
  }, [roads]);

  const validHospitals = useMemo(() => {
    return hospitals.filter(
      (h) => Number.isFinite(Number(h.lat)) && Number.isFinite(Number(h.lon))
    );
  }, [hospitals]);

  // Selected Hospital Demand Area for baseline vs flooded route comparison
  const selectedHospitalArea = useMemo(() => {
    if (!selectedHospitalAreaId || !hospitalAccess?.areas) return null;
    return hospitalAccess.areas.find((a) => a.id === selectedHospitalAreaId) || null;
  }, [selectedHospitalAreaId, hospitalAccess]);

  // Determine active traffic result based on active cascade step
  const activeTrafficResult = useMemo(() => {
    if (!whatIfScenario?.hasActiveClosures) {
      return baselineTraffic;
    }
    // In cascade tab:
    if (activeTab === "cascade") {
      if (cascadeStepIndex === 0) return baselineTraffic;
      return whatIfScenario.scenarioTraffic || baselineTraffic;
    }
    // In What-If tab:
    return whatIfScenario.scenarioTraffic || baselineTraffic;
  }, [whatIfScenario, baselineTraffic, activeTab, cascadeStepIndex]);

  // Set of blocked roads according to active cascade step
  const activeBlockedRoadsSet = useMemo(() => {
    if (!whatIfScenario?.hasActiveClosures) return new Set<string>();
    if (activeTab === "cascade" && cascadeStepIndex === 0) {
      return new Set<string>(); // Step 1 is normal
    }
    return whatIfScenario.blockedRoadIds;
  }, [whatIfScenario, activeTab, cascadeStepIndex]);

  // Set of secondary gridlock road IDs for fast lookup
  const secondaryGridlockSet = useMemo(() => {
    if (!whatIfScenario?.hasActiveClosures) return new Set<string>();
    if (activeTab === "cascade" && cascadeStepIndex < 2) {
      return new Set<string>(); // Step 1 & 2 haven't reached secondary gridlock
    }
    return new Set(whatIfScenario.secondaryGridlockRoads.map((r) => r.roadId));
  }, [whatIfScenario, activeTab, cascadeStepIndex]);

  return (
    <div
      className="w-full h-full relative select-none font-mono overflow-hidden"
      style={{
        width: "100%",
        height: "calc(100vh - 56px)",
      }}
    >
      {/* Leaflet Map */}
      <MapContainer
        key={mapKey}
        center={activeZoneCenter}
        zoom={14}
        minZoom={12}
        style={{ width: "100%", height: "100%", background: "#090c10" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsController
          bounds={validBounds}
          loading={loading}
          resetTrigger={resetTrigger}
          panelState={panelState}
        />
        <MapFlyHandler target={flyTarget} onTargetConsumed={() => setFlyTarget(null)} />
        <MapBoundsExtractor onRegisterExtract={(fn) => { extractBoundsRef.current = fn; }} />
        <MapAreaDrawInteraction
          isDrawingMode={isDrawingRectangle}
          onBoundsChange={(b) => setSelectedAreaBounds(b)}
          onDrawingComplete={() => setIsDrawingRectangle(false)}
        />

        {/* Active Analyzed Zone Bounding Box */}
        <Rectangle
          bounds={validBounds}
          pathOptions={{
            color: "#06b6d4",
            weight: 2,
            dashArray: "4 4",
            fillColor: "#06b6d4",
            fillOpacity: 0.03,
          }}
          interactive={false}
        />

        {/* Selected Area Highlighted Rectangle */}
        {selectedAreaBounds && (
          <Rectangle
            bounds={selectedAreaBounds}
            pathOptions={{
              color: isAreaTooLarge || isAreaTooSmall ? "#f43f5e" : "#f59e0b",
              weight: 2.5,
              dashArray: "6 4",
              fillColor: isAreaTooLarge || isAreaTooSmall ? "#f43f5e" : "#f59e0b",
              fillOpacity: 0.18,
            }}
          >
            <Tooltip permanent direction="center">
              <div className="font-mono text-xs font-bold text-slate-900 px-2.5 py-1 rounded bg-white shadow-xl border border-slate-300">
                {selectedAreaKm2} km²
              </div>
            </Tooltip>
          </Rectangle>
        )}

        {/* Flood Hotspots Inundation Radiuses (filtered for current zone) */}
        {showHotspotCircles &&
          visibleHotspots.map((hotspot) => {
            const isFloodedInScenario = Boolean(
              whatIfScenario?.floodedHotspots?.some(
                (h) => h.id === hotspot.id || h.name.toLowerCase() === hotspot.name.toLowerCase()
              )
            );
            const isSelected =
              selectedHotspotIds.includes(hotspot.id) ||
              selectedHotspotId === hotspot.id ||
              selectedHotspotId === hotspot.name ||
              isFloodedInScenario;
            const radius = getEffectiveRadius(hotspot, rainfallLevel);

            return (
              <Circle
                key={`hotspot-${hotspot.id || hotspot.name}`}
                center={[hotspot.lat, hotspot.lon]}
                radius={radius}
                pathOptions={{
                  color: isFloodedInScenario ? "#f43f5e" : isSelected ? "#38bdf8" : "#0284c7",
                  weight: isSelected || isFloodedInScenario ? 2.8 : 1.2,
                  dashArray: isSelected || isFloodedInScenario ? "4 3" : "2 2",
                  fillColor: isFloodedInScenario ? "#f43f5e" : isSelected ? "#0284c7" : "#0369a1",
                  fillOpacity: isFloodedInScenario ? 0.38 : isSelected ? 0.35 : 0.16,
                }}
                eventHandlers={{
                  click: () => {
                    if (onToggleHotspot) {
                      onToggleHotspot(hotspot.id);
                    } else if (onSelectHotspot) {
                      onSelectHotspot(isSelected ? null : (hotspot.id || hotspot.name));
                    }
                  },
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div className="font-mono text-xs text-slate-200 p-1 space-y-1 max-w-[220px]">
                    <div className="font-bold text-cyan-300 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{hotspot.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Inundation radius: <strong className="text-white">{radius}m</strong> ({rainfallLevel})
                    </div>
                    {hotspot.aliases?.length > 0 && (
                      <div className="text-[9px] text-slate-400">
                        {hotspot.aliases.join(", ")}
                      </div>
                    )}
                    <div className="text-[9px] text-amber-300/90 pt-0.5 border-t border-cyan-800/40">
                      Click to toggle What-If flood severance
                    </div>
                  </div>
                </Tooltip>
              </Circle>
            );
          })}

        {/* Render Road Segments Colored by Utilization or Highway Type */}
        {validRoads.map((road) => {
          const positions: [number, number][] = road.geometry.map(
            (p: any) => [Number(p.lat), Number(p.lon)] as [number, number]
          );
          const rId = String(road.id);
          const isBlocked = activeBlockedRoadsSet.has(rId);
          const isSecondaryGridlock = secondaryGridlockSet.has(rId);
          const stat = activeTrafficResult?.roadStats?.[road.id];
          const baseStat = baselineTraffic?.roadStats?.[road.id];
          const utilization = stat?.utilization ?? 0;
          const trafficFlow = stat?.traffic ?? 0;
          const roadCapacity = stat?.capacity ?? getRoadCapacity(road.highway, road.lanes);

          // Styling logic
          let color = getRoadHierarchyColor(road.highway);
          let weight = getRoadHierarchyWeight(road.highway);
          let dashArray: string | undefined = undefined;
          let opacity = 0.88;

          if (isBlocked) {
            // Blocked / Flooded road styling
            color = "#ef4444";
            weight = 4.8;
            dashArray = "6 5";
            opacity = 0.95;
          } else if (isSecondaryGridlock) {
            // Secondary Gridlock corridor (diverted traffic overload)
            color = "#ec4899"; // Vibrant Magenta/Pink
            weight = 4.8;
            opacity = 1.0;
          } else if (mapMode === "utilization") {
            color = stat ? getUtilizationColor(utilization) : getRoadHierarchyColor(road.highway);
            if (utilization > 100) {
              weight = 4.2;
            } else if (utilization >= 70) {
              weight = 3.2;
            } else {
              weight = 2.0;
            }
          }

          const isSelected = selectedRoadId === road.id;
          if (isSelected) {
            weight += 3;
            color = "#facc15";
          }

          return (
            <React.Fragment key={`road-${road.id}`}>
              {/* Invisible wider hit area for easy clicking */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: "#ffffff",
                  weight: 16,
                  opacity: 0.0001,
                  className: "road-hit-area cursor-pointer",
                }}
                eventHandlers={{
                  click: () => onSelectRoad && onSelectRoad(road),
                }}
              />
              <Polyline
                positions={positions}
                pathOptions={{
                  color,
                  weight,
                  opacity,
                  dashArray,
                  className: "road-polyline-transition cursor-pointer",
                }}
                eventHandlers={{
                  click: () => onSelectRoad && onSelectRoad(road),
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-mono text-xs text-slate-200 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{road.name || "Corridor Link"}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {isBlocked ? (
                        <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[9px] bg-rose-950 text-rose-300 border border-rose-700">
                          SEVERED / WATERLOGGED
                        </span>
                      ) : isSecondaryGridlock ? (
                        <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[9px] bg-pink-950 text-pink-300 border border-pink-700">
                          SECONDARY GRIDLOCK ({utilization}%)
                        </span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            utilization > 100
                              ? "bg-rose-950 text-rose-300 border border-rose-700"
                              : utilization >= 70
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          }`}
                        >
                          {utilization > 100
                            ? `Over Capacity (${utilization}%)`
                            : utilization >= 70
                            ? `Near Cap (${utilization}%)`
                            : `Normal (${utilization}%)`}
                        </span>
                      )}
                      <span className="text-slate-400 capitalize">{road.highway}</span>
                    </div>

                    <div className="text-[10px] text-slate-300 grid grid-cols-2 gap-x-2 pt-0.5 border-t border-[#223348]">
                      <div>
                        <span className="text-slate-400">Flow: </span>
                        <strong className="text-white">{trafficFlow}</strong> veh/h
                      </div>
                      <div>
                        <span className="text-slate-400">Capacity: </span>
                        <span>{roadCapacity}</span>
                      </div>
                    </div>

                    {whatIfScenario?.hasActiveClosures && baseStat && (
                      <div className="text-[9.5px] text-slate-400 pt-0.5 border-t border-[#1e2a3c]">
                        Baseline: {baseStat.utilization}% &bull; Current: {utilization}% (
                        <strong
                          className={
                            utilization > baseStat.utilization
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }
                        >
                          {utilization >= baseStat.utilization ? "+" : ""}
                          {(utilization - baseStat.utilization).toFixed(1)}% Δ
                        </strong>
                        )
                      </div>
                    )}
                  </div>
                </Tooltip>

                {/* Popup for road with interactive toggle button */}
                <Popup>
                  <div className="font-mono text-xs space-y-2 p-1 min-w-[210px] text-slate-900">
                    <div className="font-bold text-sm text-slate-950 border-b border-slate-200 pb-1">
                      {road.name || "Corridor Segment"}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                      <div>Class: <strong className="capitalize">{road.highway}</strong></div>
                      <div>Capacity: <strong>{roadCapacity}</strong></div>
                      <div>Flow: <strong>{trafficFlow}</strong></div>
                      <div>Utilization: <strong className={utilization > 100 ? "text-red-600" : ""}>{utilization}%</strong></div>
                    </div>
                    {onToggleRoadClosed && (
                      <button
                        type="button"
                        onClick={() => onToggleRoadClosed(rId)}
                        className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-colors cursor-pointer mt-1 ${
                          isBlocked
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        {isBlocked ? "REOPEN ROAD IN WHAT-IF" : "CLOSE ROAD (SIMULATE FLOOD)"}
                      </button>
                    )}
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* ROUTE COMPARISON OVERLAYS: BASELINE (CYAN) VS FLOODED (ROSE) */}
        {/* ------------------------------------------------------------- */}
        {selectedHospitalArea && (
          <>
            {/* 1. Baseline Route to Nearest Hospital (Solid Cyan) */}
            {selectedHospitalArea.baselineRouteCoords &&
              selectedHospitalArea.baselineRouteCoords.length > 1 && (
                <Polyline
                  positions={selectedHospitalArea.baselineRouteCoords}
                  pathOptions={{
                    color: "#06b6d4",
                    weight: 5.5,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="font-mono text-xs text-slate-900 font-bold p-1">
                      <div className="text-cyan-700">✓ BASELINE ROUTE (DRY ROADS)</div>
                      <div>To: {selectedHospitalArea.baselineHospital.name}</div>
                      <div>Time: {selectedHospitalArea.baselineTimeMin} min</div>
                    </div>
                  </Tooltip>
                </Polyline>
              )}

            {/* 2. Flooded Route to Nearest Hospital (Dashed Rose) */}
            {selectedHospitalArea.floodedRouteCoords &&
              selectedHospitalArea.floodedRouteCoords.length > 1 && (
                <Polyline
                  positions={selectedHospitalArea.floodedRouteCoords}
                  pathOptions={{
                    color: "#f43f5e",
                    weight: 5.5,
                    opacity: 1.0,
                    dashArray: "7 6",
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="font-mono text-xs text-slate-900 font-bold p-1">
                      <div className="text-rose-600">⚠ FLOOD DETOUR ROUTE</div>
                      <div>
                        To:{" "}
                        {selectedHospitalArea.floodedHospital?.name ||
                          selectedHospitalArea.baselineHospital.name}
                      </div>
                      <div>
                        Time: {selectedHospitalArea.floodedTimeMin} min (
                        <span className="text-red-700">
                          +{selectedHospitalArea.extraDelayMin} min delay
                        </span>
                        )
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              )}
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DEMAND NODES COLOR-CODED BY HOSPITAL ACCESS                   */}
        {/* Green: <= 15m, Amber: 15-30m, Red: >30m Golden Hour Alert     */}
        {/* ------------------------------------------------------------- */}
        {isHospitalLayerVisible &&
          hospitalAccess?.areas &&
          hospitalAccess.areas.map((area) => {
            const isSelected = selectedHospitalAreaId === area.id;
            return (
              <CircleMarker
                key={`hospital-node-${area.id}`}
                center={[area.lat, area.lon]}
                radius={isSelected ? 16 : 12}
                pathOptions={{
                  fillColor: area.statusColor,
                  fillOpacity: 0.95,
                  color: isSelected ? "#38bdf8" : "#ffffff",
                  weight: isSelected ? 3.5 : 2.0,
                  className: "hospital-demand-node cursor-pointer",
                }}
                eventHandlers={{
                  click: () =>
                    onSelectHospitalArea &&
                    onSelectHospitalArea(isSelected ? null : area.id),
                }}
              >
                <Tooltip direction="top" opacity={0.97}>
                  <div className="font-mono text-xs text-slate-200 p-1 space-y-1.5 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-[#24354d] pb-1">
                      <span className="font-bold text-white text-xs">{area.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          area.isGoldenHourBreached
                            ? "bg-rose-950 text-rose-300 border border-rose-700"
                            : area.statusColor === "#f59e0b"
                            ? "bg-amber-950 text-amber-300 border border-amber-700"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        }`}
                      >
                        {area.isGoldenHourBreached
                          ? ">30m ALERT"
                          : area.statusColor === "#f59e0b"
                          ? "15-30m DELAY"
                          : "<15m SAFE"}
                      </span>
                    </div>

                    <div className="text-[10.5px] space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Baseline Transit:</span>
                        <strong className="text-cyan-300 font-mono">
                          {area.baselineTimeMin} min
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Flooded Transit:</span>
                        <strong
                          className={`font-mono ${
                            area.extraDelayMin > 0 ? "text-rose-400" : "text-white"
                          }`}
                        >
                          {area.floodedTimeMin} min (+{area.extraDelayMin}m)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nearest Hospital:</span>
                        <span className="text-white truncate max-w-[120px]">
                          {area.floodedHospital?.name || area.baselineHospital.name}
                        </span>
                      </div>
                      <div className="flex justify-between pt-0.5 border-t border-[#1d2b3e] text-[9.5px]">
                        <span className="text-slate-400">Population:</span>
                        <span>{area.population.toLocaleString()} (illustrative)</span>
                      </div>
                      <div className="flex justify-between text-amber-300 text-[9.5px] font-bold">
                        <span>Impact Score:</span>
                        <span className="font-mono">
                          {area.impactScore.toLocaleString()} person-min
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] text-cyan-400/90 pt-0.5 border-t border-cyan-800/40 text-center">
                      Click to compare baseline vs flooded routes on map
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Hospitals Markers (Trauma + Specialty) */}
        {showHospitals &&
          validHospitals.map((h, i) => {
            const isSpecialty =
              h.type === "specialty" ||
              h.name?.toLowerCase().includes("guru nanak") ||
              h.name?.toLowerCase().includes("eye");
            return (
              <Marker
                key={h.id || `h-${i}`}
                position={[Number(h.lat), Number(h.lon)]}
                icon={isSpecialty ? specialtyHospitalIcon : hospitalIcon}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1.5 p-1 min-w-[200px] text-slate-900">
                    <div
                      className={`flex items-center gap-1.5 font-bold border-b border-slate-200 pb-1 ${
                        isSpecialty ? "text-indigo-600" : "text-red-600"
                      }`}
                    >
                      <span className="text-base font-black">{isSpecialty ? "✦" : "+"}</span>
                      <span className="text-sm">{h.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {h.address || "Central Delhi Healthcare Node"}
                    </div>
                    {isSpecialty ? (
                      <div className="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        specialty, not an emergency destination
                      </div>
                    ) : (
                      <div className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        24/7 Trauma Emergency Care
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* (a) Slim KPI Strip along the top of the map with 4 items */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto w-max max-w-[calc(100%-2rem)]">
        <div className="px-4 py-2 rounded-xl bg-white border border-[#CBD8E6] shadow-md flex items-center gap-[24px] text-xs font-sans whitespace-nowrap divide-x divide-[#CBD8E6]">
          {/* 1. Avg trip time */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#0369A1] shrink-0" />
            <span className="text-[12px] text-[#475569] whitespace-nowrap font-sans">Avg trip time:</span>
            <span className="font-mono tabular-nums font-semibold text-[#0B2540] text-xs whitespace-nowrap">
              {whatIfScenario?.hasActiveClosures
                ? `${whatIfScenario.scenarioAvgTravelTimeMin.toFixed(2)}m`
                : `${(baselineTraffic?.averageTravelTimeMinutes || 0).toFixed(2)}m`}
              {whatIfScenario?.hasActiveClosures && (
                <span className="text-[#92400E] font-bold ml-1 text-[11px]">
                  (+{whatIfScenario.avgTravelTimeDeltaPct}%)
                </span>
              )}
            </span>
          </div>

          {/* 2. Over capacity */}
          <div className="flex items-center gap-2 pl-[24px] whitespace-nowrap">
            <TrendingUp className="w-3.5 h-3.5 text-[#991B1B] shrink-0" />
            <span className="text-[12px] text-[#475569] whitespace-nowrap font-sans">Over capacity:</span>
            <span className="font-mono tabular-nums font-bold text-[#991B1B] text-xs whitespace-nowrap">
              {whatIfScenario?.hasActiveClosures
                ? (whatIfScenario.tripsDisconnectedPct > 20
                    ? "Cascade not shown"
                    : `${whatIfScenario.roadsPushedOverCapacity.length} roads`)
                : `${baselineTraffic?.overloadedRoadsCount || 0} roads`}
            </span>
          </div>

          {/* 3. Disconnected */}
          <div className="flex items-center gap-2 pl-[24px] whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-[#92400E] shrink-0" />
            <span className="text-[12px] text-[#475569] whitespace-nowrap font-sans">Disconnected:</span>
            <span className="font-mono tabular-nums font-semibold text-[#0B2540] text-xs whitespace-nowrap">
              {whatIfScenario?.hasActiveClosures
                ? `${whatIfScenario.tripsDisconnectedPct}% (${whatIfScenario.tripsDisconnected} trips)`
                : "0.0% (0 trips)"}
            </span>
          </div>

          {/* 4. Golden Hour */}
          <div className="flex items-center gap-2 pl-[24px] whitespace-nowrap">
            <HospitalIcon className="w-3.5 h-3.5 text-[#991B1B] shrink-0" />
            <span className="text-[12px] text-[#475569] whitespace-nowrap font-sans">Golden Hour:</span>
            <span
              className={`font-mono tabular-nums font-bold text-xs whitespace-nowrap ${
                (hospitalAccess?.goldenHourBreachedAreas?.length || 0) > 0
                  ? "text-[#991B1B]"
                  : "text-[#166534]"
              }`}
            >
              {(hospitalAccess?.goldenHourBreachedAreas?.length || 0) > 0
                ? `${hospitalAccess?.goldenHourBreachedAreas.length} >30m`
                : "All safe"}
            </span>
          </div>
        </div>

        {/* Requirement 2: Amber note banner if more than 20% of trips are disconnected */}
        {whatIfScenario?.hasActiveClosures && (whatIfScenario.tripsDisconnectedPct || 0) > 20 && (
          <div className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-medium text-xs shadow-md flex items-center justify-center gap-2 backdrop-blur-xs text-center max-w-xl mx-auto">
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
            <span className="leading-snug font-sans">
              Network fragmented: {whatIfScenario.tripsDisconnectedPct}% of trips have no route. The average covers only the remaining trips, so read it with the disconnected share.
            </span>
          </div>
        )}
      </div>

      {/* Golden Hour Alert as a Single Dismissible Banner at Top of Map */}
      {hospitalAccess?.hasGoldenHourBreach && !isGoldenHourDismissed && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto max-w-[calc(100%-2rem)] sm:max-w-xl w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] shadow-xl flex items-center justify-between gap-3 text-xs text-[#991B1B] font-sans">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 animate-pulse" />
              <span className="truncate text-[13px] text-[#991B1B]">
                <strong>Golden Hour Alert:</strong>{" "}
                {hospitalAccess.cutOffAreas && hospitalAccess.cutOffAreas.length > 0 && hospitalAccess.delayedAreas && hospitalAccess.delayedAreas.length > 0
                  ? `${hospitalAccess.cutOffAreas.length} cut off (no route), ${hospitalAccess.delayedAreas.length} delayed >30m`
                  : hospitalAccess.cutOffAreas && hospitalAccess.cutOffAreas.length > 0
                  ? `${hospitalAccess.cutOffAreas.length} sector(s) Cut off (${hospitalAccess.cutOffAreas[0].name}: ${hospitalAccess.cutOffAreas[0].population.toLocaleString()} residents)`
                  : `${hospitalAccess.delayedAreas?.length || hospitalAccess.goldenHourBreachedAreas.length} sector(s) delayed >30m (${(hospitalAccess.delayedAreas?.[0] || hospitalAccess.goldenHourBreachedAreas[0])?.name} at ${(hospitalAccess.delayedAreas?.[0] || hospitalAccess.goldenHourBreachedAreas[0])?.floodedTimeMin}m)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsGoldenHourDismissed(true)}
              className="p-1 rounded-md text-[#991B1B] hover:text-[#7F1D1D] hover:bg-[#FECACA] transition-colors shrink-0 cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Compact Route Trace Chip on Map */}
      {selectedHospitalArea && (
        <div className="absolute top-3 right-3 z-[1000] pointer-events-auto">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD8E6] shadow-md flex items-center gap-2 text-xs font-sans text-[#1E293B]">
            <Navigation className="w-3.5 h-3.5 text-[#0369A1] shrink-0" />
            <span className="truncate max-w-[150px] font-semibold text-[#0B2540]">{selectedHospitalArea.name}</span>
            <span className="font-mono tabular-nums text-[#475569] text-[12px]">
              {selectedHospitalArea.baselineTimeMin}m →{" "}
              {selectedHospitalArea.isUnreachable ? (
                <span className="text-[#991B1B] font-bold">
                  Cut off ({selectedHospitalArea.population.toLocaleString()} residents)
                </span>
              ) : (
                <span className={selectedHospitalArea.isGoldenHourBreached ? "text-[#991B1B] font-bold" : "text-[#92400E] font-bold"}>
                  {selectedHospitalArea.floodedTimeMin}m
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onSelectHospitalArea && onSelectHospitalArea(null)}
              className="p-0.5 rounded text-[#475569] hover:text-[#0B2540] transition-colors cursor-pointer"
              title="Clear route comparison"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* (b) Small Collapsible Legend in Bottom-Right Corner (Collapsed by Default) */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto font-sans">
        {isLegendOpen && (
          <div className="mb-2 p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-xl text-xs space-y-3 w-64 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#1E293B]">
            <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-2">
              <span className="text-[11px] font-bold text-[#0B2540] uppercase tracking-wider">
                Map Legend
              </span>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="p-1 rounded hover:bg-[#EAF1F8] text-[#475569] hover:text-[#0B2540] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-sm bg-[#166534] shrink-0" />
                <span>&lt; 70% Free flow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-sm bg-[#92400E] shrink-0" />
                <span>70–100% Near capacity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-sm bg-[#991B1B] shrink-0" />
                <span>&gt; 100% Over capacity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-sm bg-[#991B1B] border border-white border-dashed shrink-0" />
                <span>Severed corridor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-sm bg-[#7C3AED] shrink-0" />
                <span>Secondary gridlock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0369A1]/30 border border-[#0369A1] shrink-0" />
                <span>Waterlogging hotspot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#991B1B] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  +
                </span>
                <span>Trauma hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  ✦
                </span>
                <span>Specialty, not an emergency destination</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#991B1B] border border-white shrink-0" />
                <span>&gt; 30m Golden Hour breach</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EAF1F8] text-xs text-[#0B2540] font-semibold border border-[#CBD8E6] shadow-md flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Layers className="w-4 h-4 text-[#0369A1]" />
          <span>Legend</span>
          {isLegendOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#475569]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#475569]" />}
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-[#0B2540]/30 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
          <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-2xl text-center space-y-3 max-w-sm w-full font-sans">
            <div className="w-11 h-11 mx-auto rounded-full bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="text-[15px] font-bold text-[#0B2540]">
              Loading Road Infrastructure
            </div>
            <div className="text-[13px] text-[#475569] bg-[#EAF1F8] border border-[#CBD8E6] px-3.5 py-2.5 rounded-lg leading-relaxed">
              {loadingMessage || "Querying OpenStreetMap for drivable roads..."}
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {!loading && (Boolean(fetchError) || roads.length === 0) && (
        <div className="absolute inset-0 z-[1900] bg-[#0B2540]/30 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto font-sans">
          <div className="p-6 rounded-2xl bg-white border border-[#FECACA] shadow-2xl text-center space-y-4 max-w-md w-full">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#991B1B]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-[15px] font-bold text-[#0B2540]">
                Road Network Loading Issue
              </div>
              <p className="text-[13px] text-[#991B1B] leading-relaxed">
                {fetchError || "No roads found in this area. Try a different or slightly larger area."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onRetryAnalysis || onRefresh}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Overpass fetch</span>
              </button>
              <Link
                to="/select-area"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-[#0B2540] font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Scan className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Change area</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
