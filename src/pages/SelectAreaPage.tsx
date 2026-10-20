import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Activity,
  Home,
  Map as MapIcon,
  Search,
  Scan,
  Square,
  Maximize2,
  Check,
  AlertTriangle,
  Play,
  RotateCcw,
  RefreshCw,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import LocationSearch from "../components/LocationSearch";
import { calculateAreaKm2 } from "../utils/geo";
import { useAppState, DEFAULT_CENTRAL_DELHI_ZONE } from "../context/AppStateContext";

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapInvalidator() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Call after map mounts with 200ms delay
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Call on window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

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

export default function SelectAreaPage() {
  const navigate = useNavigate();
  const {
    currentZone,
    loading,
    loadingMessage,
    fetchError,
    handleRunAnalysisArea,
    loadZoneData,
  } = useAppState();

  const [selectedAreaBounds, setSelectedAreaBounds] = useState<[[number, number], [number, number]] | null>([
    [currentZone.south, currentZone.west],
    [currentZone.north, currentZone.east],
  ]);
  const [isDrawingRectangle, setIsDrawingRectangle] = useState<boolean>(false);
  const [mapKey] = useState<string>(() => `select-area-map-${Date.now()}`);
  const [flyTarget, setFlyTarget] = useState<{
    center?: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);

  const extractBoundsRef = useRef<(() => [[number, number], [number, number]]) | null>(null);

  const selectedAreaKm2 = useMemo(() => {
    if (!selectedAreaBounds) return 0;
    return calculateAreaKm2(selectedAreaBounds);
  }, [selectedAreaBounds]);

  const isAreaTooLarge = selectedAreaKm2 > 25.0;
  const isAreaTooSmall = selectedAreaKm2 > 0 && selectedAreaKm2 < 0.3;
  const isAreaValid = Boolean(selectedAreaBounds && !isAreaTooLarge && !isAreaTooSmall);

  // Handle Location Search selection
  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string, bbox?: [number, number, number, number]) => {
      if (bbox) {
        const bounds: [[number, number], [number, number]] = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        setFlyTarget({ bounds });
        setSelectedAreaBounds(bounds);
      } else {
        setFlyTarget({ center: [lat, lon], zoom: 14 });
      }
    },
    []
  );

  // Handle "Use current view"
  const handleUseCurrentView = useCallback(() => {
    if (extractBoundsRef.current) {
      const b = extractBoundsRef.current();
      setSelectedAreaBounds(b);
      setIsDrawingRectangle(false);
    }
  }, []);

  // Handle "Use default Central Delhi zone"
  const handleUseDefaultZone = useCallback(async () => {
    setSelectedAreaBounds([
      [DEFAULT_CENTRAL_DELHI_ZONE.south, DEFAULT_CENTRAL_DELHI_ZONE.west],
      [DEFAULT_CENTRAL_DELHI_ZONE.north, DEFAULT_CENTRAL_DELHI_ZONE.east],
    ]);
    await loadZoneData(DEFAULT_CENTRAL_DELHI_ZONE, false);
    navigate("/dashboard");
  }, [loadZoneData, navigate]);

  // Handle "Run analysis on this area"
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedAreaBounds || !isAreaValid) return;
    try {
      const ok = await handleRunAnalysisArea(selectedAreaBounds);
      if (ok) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.info("Area analysis error:", err?.message || err);
    }
  }, [selectedAreaBounds, isAreaValid, handleRunAnalysisArea, navigate]);

  return (
    <div className="relative w-full min-h-screen bg-[#EAF1F8] text-[#1E293B] flex flex-col font-sans select-none">
      {/* Top Header Navigation (FRAME deep navy #0B2540) */}
      <header className="h-[64px] bg-[#0B2540] border-b border-[#1A3B5C] px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 select-none shadow-md text-[#E6EEF7]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to Cover Page"
          >
            <Home className="w-4 h-4 text-[#67E8F9]" />
            <span>Home</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E7490] border border-[#67E8F9]/40 flex items-center justify-center text-white shadow-xs">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight text-[#E6EEF7] flex items-center gap-2">
                <span>RoadRisk Delhi</span>
                <span className="text-[12px] text-[#7DD3FC] px-2 py-0.5 rounded-md bg-[#12355A] border border-[#2B4A6B] font-semibold">
                  Select Area
                </span>
              </div>
              <span className="text-[12px] text-[#9FB3C8] hidden xl:block">
                Choose or draw a custom bounding box (0.3 km² – 25 km²) to run risk screening
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-[13px]">
          <button
            type="button"
            onClick={handleUseDefaultZone}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Quickly switch to default Central Delhi zone and open Dashboard"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#67E8F9]" />
            <span className="hidden sm:inline">Use Default Central Delhi</span>
            <span className="sm:hidden">Default</span>
          </button>

          <Link
            to="/dashboard"
            className="px-3.5 py-1.5 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Open Interactive Simulation Dashboard"
          >
            <MapIcon className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Full-Screen Map Container with Explicit Real Dimensions */}
      <div
        className="relative w-full overflow-hidden bg-slate-100"
        style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)" }}
      >
        <MapContainer
          key={mapKey}
          center={currentZone.center}
          zoom={14}
          style={{ position: "relative", width: "100%", height: "100%", background: "#F1F5F9" }}
          zoomControl={true}
        >
          <MapInvalidator />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewController center={currentZone.center} zoom={14} />
          <MapFlyHandler target={flyTarget} onTargetConsumed={() => setFlyTarget(null)} />
          <MapBoundsExtractor onRegisterExtract={(fn) => { extractBoundsRef.current = fn; }} />
          <MapAreaDrawInteraction
            isDrawingMode={isDrawingRectangle}
            onBoundsChange={(b) => setSelectedAreaBounds(b)}
            onDrawingComplete={() => setIsDrawingRectangle(false)}
          />

          {/* Current Active Zone (Dashed Cyan) */}
          <Rectangle
            bounds={[
              [currentZone.south, currentZone.west],
              [currentZone.north, currentZone.east],
            ]}
            pathOptions={{
              color: "#06b6d4",
              weight: 2,
              dashArray: "4 4",
              fillColor: "#06b6d4",
              fillOpacity: 0.04,
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
                fillOpacity: 0.22,
              }}
            >
              <Tooltip permanent direction="center">
                <div className="font-mono text-xs font-bold text-slate-900 px-2.5 py-1 rounded bg-white shadow-xl border border-slate-300">
                  {selectedAreaKm2} km²
                </div>
              </Tooltip>
            </Rectangle>
          )}
        </MapContainer>

        {/* FLOATING TOP-LEFT TOOLBAR: SEARCH & DEFINE BOUNDING BOX CARD */}
        <div
          className="absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 max-w-lg w-[calc(100%-2rem)] sm:w-[480px] pointer-events-auto"
          style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 1000 }}
        >
          {/* Search Box */}
          <LocationSearch onSelectLocation={handleLocationSelect} />

          {/* Area Control Card */}
          <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-xl space-y-3 font-sans text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#CBD8E6] pb-3">
              <div className="space-y-0.5">
                <div className="font-bold text-[#0B2540] text-[13px] flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-[#F59E0B]" />
                  <span>Define Bounding Box Area (0.3 km² – 25 km²)</span>
                </div>
                <div className="text-[12px] text-[#475569]">
                  Draw on map or snap to current view, then run network risk analysis:
                </div>
              </div>

              {/* Action Buttons: Draw vs Current View */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawingRectangle((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDrawingRectangle
                      ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-xs"
                      : "bg-white hover:bg-[#EAF1F8] text-[#0B2540] border border-[#CBD8E6]"
                  }`}
                  title="Click and drag on the map to draw a custom rectangle"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{isDrawingRectangle ? "Dragging on Map..." : "Draw Rectangle"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentView}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF1F8] text-[#0B2540] border border-[#CBD8E6] text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Take the currently visible map viewport bounds"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#0369A1]" />
                  <span>Use Current View</span>
                </button>
              </div>
            </div>

            {/* Instruction if drawing */}
            {isDrawingRectangle && (
              <div className="p-2.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[12px] text-[#92400E] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#92400E] animate-ping shrink-0" />
                <span>
                  <strong>Draw Mode Active:</strong> Click and drag diagonally on the map to define your bounding box. Release to set.
                </span>
              </div>
            )}

            {/* Metrics & Validation Strip */}
            {selectedAreaBounds && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#EAF1F8] border border-[#CBD8E6]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#475569] font-bold uppercase tracking-wider">Selected Area:</span>
                    <span className="text-[14px] font-bold text-[#0B2540] font-mono tabular-nums">
                      {selectedAreaKm2} km²
                    </span>
                  </div>

                  {isAreaTooLarge && (
                    <div className="text-[12px] text-[#991B1B] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#991B1B] shrink-0" />
                      <span>
                        Area exceeds the 25 km² limit ({selectedAreaKm2} km²). Please select a smaller box.
                      </span>
                    </div>
                  )}

                  {isAreaTooSmall && (
                    <div className="text-[12px] text-[#92400E] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#92400E] shrink-0" />
                      <span>
                        Area is below the 0.3 km² minimum ({selectedAreaKm2} km²). Please select a larger box.
                      </span>
                    </div>
                  )}

                  {isAreaValid && (
                    <div className="text-[12px] text-[#166534] font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#166534] shrink-0" />
                      <span>Area size valid ({selectedAreaKm2} km²). Ready to query OpenStreetMap.</span>
                    </div>
                  )}
                </div>

                {/* Run Analysis Button */}
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={!isAreaValid || loading}
                  className={`px-4 py-2.5 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer ${
                    isAreaValid && !loading
                      ? "bg-[#0369A1] hover:bg-[#075985] text-white"
                      : "bg-[#CBD8E6] text-[#475569] border border-[#94A9BF] cursor-not-allowed"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Analysis on This Area</span>
                </button>
              </div>
            )}
          </div>

          {/* OVERPASS ERROR CARD WITH RETRY BUTTON */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-[#991B1B] text-[13px]">
                  <AlertOctagon className="w-4 h-4 text-[#991B1B] shrink-0" />
                  <span>OpenStreetMap Query Issue</span>
                </div>
                <p className="text-[#991B1B] text-[12px] leading-relaxed">
                  {fetchError}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseDefaultZone}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF1F8] text-[#0B2540] border border-[#CBD8E6] font-semibold text-[12px] cursor-pointer"
                >
                  Use Central Delhi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LOADING OVERLAY WHILE ROADS LOAD */}
        {loading && (
          <div className="absolute inset-0 z-[2000] bg-[#0B2540]/30 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-2xl text-center space-y-3 max-w-sm w-full font-sans">
              <div className="w-11 h-11 mx-auto rounded-full bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1]">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">
                Loading Road Infrastructure
              </div>
              <div className="text-[13px] text-[#475569] bg-[#EAF1F8] border border-[#CBD8E6] px-3.5 py-2.5 rounded-lg leading-relaxed">
                {loadingMessage || "Querying OpenStreetMap for drivable roads in target area..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
