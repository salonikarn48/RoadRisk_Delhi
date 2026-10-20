import React, { useState, useMemo } from "react";
import {
  X,
  Droplets,
  CloudRain,
  ShieldAlert,
  Layers,
  TrendingUp,
  Activity,
  Hospital as HospitalIcon,
  Play,
  Pause,
  ArrowRight,
  RotateCcw,
  Search,
  Check,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { SidebarSectionKey } from "./LeftSidebar";
import { WhatIfScenarioResult, RainfallLevel } from "../simulation/whatIfEngine";
import { HospitalAccessAnalysisResult, DemandNodeAccess } from "../simulation/hospitalAccessibilityEngine";
import { RAINFALL_LEVELS, getEffectiveRadius } from "../data/floodHotspots";

export interface DetailPanelProps {
  activePanel: SidebarSectionKey;
  onClose: () => void;
  onSwitchPanel: (panel: SidebarSectionKey) => void;

  // 1. Hotspots Props
  activeZoneHotspots: any[];
  selectedHotspotIds: string[];
  onToggleHotspot: (id: string) => void;
  onSelectAllHotspots: () => void;
  onClearHotspots: () => void;
  onMonsoonPreset: () => void;
  onSeverePreset: () => void;

  // 2. Rainfall Props
  rainfallLevel: RainfallLevel;
  onSetRainfallLevel: (level: RainfallLevel) => void;

  // 3. Closures Props
  roads: any[];
  closedRoadIds: Set<string>;
  effectiveClosedRoadIds: Set<string>;
  onToggleRoadClosed: (id: string) => void;
  selectedRoad: any | null;
  onClearSelectedRoad: () => void;
  onResetClosures: () => void;

  // 4. Layers Props
  mapMode: "utilization" | "hierarchy";
  onSetMapMode: (mode: "utilization" | "hierarchy") => void;
  showHotspotCircles: boolean;
  onToggleHotspots: () => void;
  showHospitalNodes: boolean;
  onToggleHospitalNodes: () => void;

  // 5. Traffic Impact Props
  whatIfScenario: WhatIfScenarioResult | null;
  baselineTraffic: any | null;

  // 6. Cascade Props
  cascadeStepIndex: number;
  onSetCascadeStepIndex: (step: number) => void;

  // 7. Hospital Access Props
  hospitalAccess: HospitalAccessAnalysisResult | null;
  selectedHospitalAreaId: string | null;
  onSelectHospitalArea: (areaId: string | null) => void;
}

export default function DetailPanel({
  activePanel,
  onClose,
  onSwitchPanel,
  activeZoneHotspots,
  selectedHotspotIds,
  onToggleHotspot,
  onSelectAllHotspots,
  onClearHotspots,
  onMonsoonPreset,
  onSeverePreset,
  rainfallLevel,
  onSetRainfallLevel,
  roads,
  effectiveClosedRoadIds,
  onToggleRoadClosed,
  selectedRoad,
  onClearSelectedRoad,
  onResetClosures,
  mapMode,
  onSetMapMode,
  showHotspotCircles,
  onToggleHotspots,
  showHospitalNodes,
  onToggleHospitalNodes,
  whatIfScenario,
  baselineTraffic,
  cascadeStepIndex,
  onSetCascadeStepIndex,
  hospitalAccess,
  selectedHospitalAreaId,
  onSelectHospitalArea,
}: DetailPanelProps) {
  const [roadSearch, setRoadSearch] = useState<string>("");
  const [isCascadePlaying, setIsCascadePlaying] = useState<boolean>(false);
  const panelScrollRef = React.useRef<HTMLDivElement>(null);

  // Reset scroll to top whenever panel opens or active parameter changes
  React.useEffect(() => {
    if (panelScrollRef.current) {
      panelScrollRef.current.scrollTop = 0;
    }
  }, [activePanel]);

  // Auto-play interval for cascade
  React.useEffect(() => {
    let interval: any = null;
    if (isCascadePlaying) {
      interval = setInterval(() => {
        onSetCascadeStepIndex((cascadeStepIndex + 1) % 3);
      }, 1600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCascadePlaying, cascadeStepIndex, onSetCascadeStepIndex]);

  // Filtered roads list for Corridor Closures panel
  const filteredRoads = useMemo(() => {
    if (!roadSearch.trim()) return roads.slice(0, 40);
    const q = roadSearch.toLowerCase();
    return roads
      .filter((r) => (r.name && r.name.toLowerCase().includes(q)) || (r.highway && r.highway.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [roads, roadSearch]);

  // Render Horizontal Metric Bar for Road Utilization
  const renderUtilizationBar = (baselineUtil: number, scenarioUtil: number, label: string = "Utilization") => {
    const cappedScenario = Math.min(140, Math.max(0, scenarioUtil));
    const cappedBaseline = Math.min(140, Math.max(0, baselineUtil));
    const widthPct = Math.min(100, (cappedScenario / 140) * 100);
    const baselineMarkerLeft = Math.min(100, (cappedBaseline / 140) * 100);
    const isOverCap = scenarioUtil > 100;
    const isNearCap = scenarioUtil >= 70 && scenarioUtil <= 100;
    const barColor = isOverCap ? "bg-[#991B1B]" : isNearCap ? "bg-[#92400E]" : "bg-[#166534]";

    return (
      <div className="space-y-1.5 font-sans">
        <div className="flex justify-between items-center text-xs text-[#1E293B]">
          <span>{label}</span>
          <span className="font-mono tabular-nums">
            <span className="text-[#475569]">{baselineUtil}%</span>
            {" → "}
            <span className={isOverCap ? "text-[#991B1B] font-bold" : isNearCap ? "text-[#92400E] font-bold" : "text-[#166534] font-bold"}>
              {scenarioUtil}%
            </span>
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[#E2E8F0] border border-[#CBD8E6] relative overflow-hidden">
          {/* Threshold markers at 70% and 100% */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#94A9BF] z-10"
            style={{ left: `${(70 / 140) * 100}%` }}
            title="70% capacity threshold"
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-[#475569] z-10"
            style={{ left: `${(100 / 140) * 100}%` }}
            title="100% design capacity"
          />
          {/* Scenario bar */}
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-300`}
            style={{ width: `${widthPct}%` }}
          />
          {/* Baseline marker pip */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#0369A1] z-20"
            style={{ left: `${baselineMarkerLeft}%` }}
            title={`Baseline: ${baselineUtil}%`}
          />
        </div>
      </div>
    );
  };

  // Render Horizontal Metric Bar for Hospital Access with 30m marker
  const renderHospitalAccessBar = (area: DemandNodeAccess) => {
    const isCutOff = area.isUnreachable;
    const maxScale = 60; // 60 minutes scale
    const baselineWidth = Math.min(100, (area.baselineTimeMin / maxScale) * 100);
    const floodedWidth = Math.min(100, (area.floodedTimeMin / maxScale) * 100);
    const isBreached = area.isGoldenHourBreached;
    const isSelected = selectedHospitalAreaId === area.id;

    return (
      <div
        key={area.id}
        onClick={() => onSelectHospitalArea(isSelected ? null : area.id)}
        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 font-sans ${
          isSelected
            ? "bg-[#E0F2FE] border-2 border-[#0369A1] shadow-xs"
            : "bg-white border border-[#CBD8E6] hover:border-[#94A9BF]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[#0B2540] text-[13px] truncate">
              {area.name}
            </div>
            <div className="text-xs text-[#475569] truncate mt-0.5">
              To {area.floodedHospital?.name || area.baselineHospital.name}
            </div>
          </div>
          <div className="text-right shrink-0">
            {isCutOff ? (
              <div className="text-right">
                <span className="text-xs font-bold text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-md border border-[#FECACA]">
                  Cut off
                </span>
                <div className="text-[10px] text-[#991B1B] font-medium mt-0.5">
                  {area.population.toLocaleString()} residents
                </div>
              </div>
            ) : (
              <div className="font-mono tabular-nums text-xs">
                <span className="text-[#475569]">{area.baselineTimeMin}m</span>
                {" → "}
                <span className={isBreached ? "text-[#991B1B] font-bold" : "text-[#0B2540] font-semibold"}>
                  {area.floodedTimeMin}m
                </span>
                {area.extraDelayMin > 0 && (
                  <span className="text-[#92400E] text-[11px] ml-1 font-bold">
                    (+{area.extraDelayMin}m)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar with 30m Golden Hour vertical line */}
        <div className="relative pt-1">
          <div className="h-2.5 rounded-full bg-[#E2E8F0] border border-[#CBD8E6] relative overflow-hidden">
            {/* 30m Golden Hour marker (at 50% of 60m scale) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#991B1B] z-20"
              style={{ left: "50%" }}
            />
            {isCutOff ? (
              <div className="h-full w-full bg-[#991B1B] rounded-full flex items-center justify-center text-[10px] text-white font-bold tracking-wider">
                Cut off
              </div>
            ) : (
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isBreached ? "bg-[#991B1B]" : area.floodedTimeMin > 15 ? "bg-[#92400E]" : "bg-[#166534]"
                }`}
                style={{ width: `${floodedWidth}%` }}
              />
            )}
            {/* Baseline tick */}
            {!isCutOff && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#0369A1] z-10 opacity-75"
                style={{ left: `${baselineWidth}%` }}
              />
            )}
          </div>
          {/* Small label for 30m Golden Hour marker */}
          <div className="flex justify-between items-center text-[11px] text-[#475569] pt-1">
            <span>0m</span>
            <span className="text-[#991B1B] font-bold">30m Golden Hour</span>
            <span>60m</span>
          </div>
        </div>
      </div>
    );
  };

  // Header metadata based on active panel
  const panelMeta = {
    hotspots: {
      title: "Hotspots",
      icon: Droplets,
      subtitle: `${activeZoneHotspots.filter((h) => selectedHotspotIds.includes(h.id)).length} of ${activeZoneHotspots.length} inundated`,
    },
    rainfall: {
      title: "Rainfall Intensity",
      icon: CloudRain,
      subtitle: `Current: ${rainfallLevel.toUpperCase()}`,
    },
    closures: {
      title: "Corridor Closures",
      icon: ShieldAlert,
      subtitle: `${effectiveClosedRoadIds.size} road sections blocked`,
    },
    layers: {
      title: "Map Layers & Legend",
      icon: Layers,
      subtitle: "Display options & styling",
    },
    traffic: {
      title: "Traffic Impact",
      icon: TrendingUp,
      subtitle: whatIfScenario?.hasActiveClosures
        ? `${whatIfScenario.avgTravelTimeDeltaPct >= 0 ? "+" : ""}${whatIfScenario.avgTravelTimeDeltaPct}% avg trip time`
        : "Nominal baseline network",
    },
    cascade: {
      title: "Cascade Ripple Effect",
      icon: Activity,
      subtitle:
        (whatIfScenario?.tripsDisconnectedPct || 0) > 20
          ? "Cascade not shown: most flows have no alternative route"
          : `${whatIfScenario?.secondaryGridlockRoads?.length || 0} roads over capacity`,
    },
    hospitals: {
      title: "Hospital Accessibility",
      icon: HospitalIcon,
      subtitle: hospitalAccess?.goldenHourBreachedAreas?.length
        ? `${hospitalAccess.goldenHourBreachedAreas.length} areas breached 30m Golden Hour`
        : "All monitored areas within safe range",
    },
  }[activePanel];

  const IconComponent = panelMeta?.icon || Activity;

  return (
    <aside className="w-[380px] shrink-0 h-full bg-[#EAF1F8] border-r border-[#CBD8E6] flex flex-col z-20 overflow-hidden font-sans select-none animate-in fade-in slide-in-from-left-4 duration-200 shadow-md">
      {/* Detail Panel Header with Title and Close (X) button */}
      <div className="p-4 border-b border-[#CBD8E6] flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-[#E0F2FE] border border-[#CBD8E6] text-[#0369A1] shrink-0 shadow-2xs">
            <IconComponent className="w-5 h-5 text-[#0369A1]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0B2540] truncate font-sans">
              {panelMeta?.title}
            </h2>
            <p className="text-xs text-[#475569] truncate mt-0.5">
              {panelMeta?.subtitle}
            </p>
          </div>
        </div>

        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#EAF1F8] text-[#475569] hover:text-[#0B2540] transition-colors cursor-pointer shrink-0 ml-2"
          title="Close panel"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Detail Panel Body (single vertical scroll container) */}
      <div ref={panelScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-sm">
        {/* ============================================================== */}
        {/* PANEL 1: HOTSPOTS                                             */}
        {/* ============================================================== */}
        {activePanel === "hotspots" && (
          <div className="space-y-4">
            {/* Event Presets */}
            <div className="space-y-2">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Scenario Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onMonsoonPreset}
                  className="p-3 rounded-xl bg-white hover:bg-[#E0F2FE]/50 border border-[#CBD8E6] hover:border-[#0369A1] text-left transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0369A1] group-hover:text-[#075985]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#0369A1]" />
                    <span>Monsoon Storm</span>
                  </div>
                  <div className="text-[11px] text-[#475569] mt-1 font-sans">
                    3 key flood hotspots
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onSeverePreset}
                  className="p-3 rounded-xl bg-white hover:bg-[#FEE2E2]/50 border border-[#CBD8E6] hover:border-[#FECACA] text-left transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#991B1B] group-hover:text-[#7F1D1D]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#991B1B]" />
                    <span>Worst-case stress test (all hotspots flooded)</span>
                  </div>
                  <div className="text-[11px] text-[#475569] mt-1 font-sans">
                    All hotspots inundated
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Actions (Select All / Clear) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#475569] font-semibold">
                {selectedHotspotIds.length} of {activeZoneHotspots.length} active
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSelectAllHotspots}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-xs font-medium text-[#1E293B] hover:text-[#0B2540] transition-colors cursor-pointer shadow-2xs"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={onClearHotspots}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-xs font-medium text-[#475569] hover:text-[#0B2540] transition-colors cursor-pointer shadow-2xs"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Hotspot Checklist */}
            <div className="space-y-1.5">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Flood Hotspot Checklist
              </span>
              {activeZoneHotspots.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] text-center text-xs text-[#475569]">
                  No flood hotspots mapped inside the current analysis zone.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeZoneHotspots.map((hotspot) => {
                    const isSelected = selectedHotspotIds.includes(hotspot.id);
                    const radius = getEffectiveRadius(hotspot, rainfallLevel);
                    return (
                      <div
                        key={hotspot.id}
                        onClick={() => onToggleHotspot(hotspot.id)}
                        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                          isSelected
                            ? "bg-[#E0F2FE] border-2 border-[#0369A1]"
                            : "bg-white border border-[#CBD8E6] hover:border-[#94A9BF]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded border-[#94A9BF] text-[#0369A1] focus:ring-0 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#0B2540] truncate">
                              {hotspot.name}
                            </div>
                            <div className="text-xs text-[#475569] truncate mt-0.5">
                              Inundation radius: {radius}m ({rainfallLevel})
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                            isSelected
                              ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                              : "bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]"
                          }`}
                        >
                          {isSelected ? "Flooded" : "Dry"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reset Scenario Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClearHotspots();
                  onResetClosures();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#FEE2E2]/60 text-[#991B1B] border border-[#CBD8E6] flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#991B1B]" />
                <span>Reset scenario</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 2: RAINFALL                                             */}
        {/* ============================================================== */}
        {activePanel === "rainfall" && (
          <div className="space-y-4">
            <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
              Rainfall Severity Options
            </span>
            <div className="space-y-3">
              {(["Moderate", "Heavy", "Extreme"] as RainfallLevel[]).map((level) => {
                const config = (RAINFALL_LEVELS as any)[level] || {
                  multiplier: level === "Moderate" ? 0.4 : level === "Heavy" ? 0.7 : 1.0,
                  label: level,
                  description: "",
                };
                const isSelected = rainfallLevel === level;
                const rateText = level === "Moderate" ? "35 mm/h" : level === "Heavy" ? "70 mm/h" : "110 mm/h";
                const drainageText = level === "Moderate" ? "30-45m" : level === "Heavy" ? "60-90m" : ">120m";

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onSetRainfallLevel(level)}
                    className={`w-full p-4 rounded-xl text-left transition-all cursor-pointer relative shadow-2xs ${
                      isSelected
                        ? "bg-[#E0F2FE] border-2 border-[#0369A1] shadow-xs"
                        : "bg-white border border-[#CBD8E6] hover:border-[#94A9BF]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B2540] capitalize text-base font-sans">
                          {level}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white text-[#0369A1] border border-[#CBD8E6]">
                          {rateText}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-[#0369A1] text-white">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-[#475569] leading-relaxed font-sans">
                      {config.description || "Inundation extent multiplier"}
                    </div>
                    <div className="text-[11px] text-[#475569] mt-2 font-mono flex items-center gap-3">
                      <span>Flood Radius: {config.multiplier}×</span>
                      <span>Drainage Time: {drainageText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#475569] text-center font-sans mt-2 italic">
              Illustrative values for scenario modeling
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 3: CORRIDOR CLOSURES                                    */}
        {/* ============================================================== */}
        {activePanel === "closures" && (
          <div className="space-y-4">
            {/* Filter Search Box (Input with 1px border #94A9BF, focus #0369A1) */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roadSearch}
                onChange={(e) => setRoadSearch(e.target.value)}
                placeholder="Filter corridors by name or class..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#94A9BF] text-xs text-[#1E293B] placeholder-[#94A9BF] focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] font-sans shadow-2xs"
              />
            </div>

            {/* Reset All Closures Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#475569] font-semibold">
                {effectiveClosedRoadIds.size} corridor{effectiveClosedRoadIds.size === 1 ? "" : "s"} closed
              </span>
              <button
                type="button"
                onClick={onResetClosures}
                disabled={effectiveClosedRoadIds.size === 0}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-xs text-[#1E293B] hover:text-[#0B2540] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <RotateCcw className="w-3 h-3 text-[#0369A1]" />
                <span>Reset all</span>
              </button>
            </div>

            {/* Selected Road Card from Map */}
            {selectedRoad && (
              <div className="p-3.5 rounded-xl bg-[#E0F2FE] border-2 border-[#0369A1] space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#0369A1] font-bold uppercase tracking-wider text-[11px]">
                    Inspected Corridor
                  </span>
                  <button
                    type="button"
                    onClick={onClearSelectedRoad}
                    className="text-[#475569] hover:text-[#0B2540]"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-sm font-bold text-[#0B2540]">
                  {selectedRoad.name || "Unnamed Highway Segment"}
                </div>
                <div className="text-xs text-[#475569]">
                  Class: {selectedRoad.highway || "Road"} | Speed limit: {selectedRoad.maxspeed || "50 km/h"}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleRoadClosed(selectedRoad.id)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer mt-1 ${
                    effectiveClosedRoadIds.has(selectedRoad.id)
                      ? "bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] border border-[#BBF7D0]"
                      : "bg-[#991B1B] hover:bg-[#7F1D1D] text-white"
                  }`}
                >
                  {effectiveClosedRoadIds.has(selectedRoad.id) ? "Reopen Corridor" : "Close Corridor"}
                </button>
              </div>
            )}

            {/* Corridor List */}
            <div className="space-y-1.5">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Road Network Corridors ({filteredRoads.length})
              </span>
              <div className="space-y-2">
                {filteredRoads.map((road) => {
                  const isClosed = effectiveClosedRoadIds.has(road.id);
                  const isFlooded = whatIfScenario?.hotspotBlockedRoadIds?.has(road.id) || whatIfScenario?.blockedRoadIds?.has(road.id);
                  return (
                    <div
                      key={road.id}
                      className="p-3 rounded-xl bg-white border border-[#CBD8E6] hover:border-[#94A9BF] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#0B2540] truncate">
                          {road.name || "Unnamed Road Section"}
                        </div>
                        <div className="text-xs text-[#475569] truncate flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{road.highway || "Road"}</span>
                          {isClosed && (
                            <span className="text-[11px] font-bold text-[#991B1B]">
                              {isFlooded ? "• Flooded" : "• Manual closure"}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleRoadClosed(road.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                          isClosed
                            ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] hover:bg-[#BBF7D0]"
                            : "bg-white hover:bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                        }`}
                      >
                        {isClosed ? "Reopen" : "Close"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 4: MAP LAYERS & LEGEND                                  */}
        {/* ============================================================== */}
        {activePanel === "layers" && (
          <div className="space-y-5">
            {/* Display Mode Selection */}
            <div className="space-y-2">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Road Color Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetMapMode("utilization")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                    mapMode === "utilization"
                      ? "bg-[#E0F2FE] border-2 border-[#0369A1] text-[#0B2540] font-bold"
                      : "bg-white border-[#CBD8E6] text-[#1E293B] hover:bg-[#EAF1F8]"
                  }`}
                >
                  <div className="font-bold text-[13px]">Road Utilization</div>
                  <div className="text-[11px] text-[#475569] mt-0.5">
                    Green &lt;70%, Amber 70-100%, Red &gt;100%
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSetMapMode("hierarchy")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                    mapMode === "hierarchy"
                      ? "bg-[#E0F2FE] border-2 border-[#0369A1] text-[#0B2540] font-bold"
                      : "bg-white border-[#CBD8E6] text-[#1E293B] hover:bg-[#EAF1F8]"
                  }`}
                >
                  <div className="font-bold text-[13px]">Road Class</div>
                  <div className="text-[11px] text-[#475569] mt-0.5">
                    Motorway, Primary, Secondary, Tertiary
                  </div>
                </button>
              </div>
            </div>

            {/* Overlays toggles */}
            <div className="space-y-2 pt-2 border-t border-[#CBD8E6]">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Map Overlays
              </span>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#CBD8E6] cursor-pointer shadow-2xs hover:border-[#94A9BF]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#0B2540]">Waterlogging hotspot radiuses</div>
                    <div className="text-xs text-[#475569]">Flood extent circles based on rainfall</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showHotspotCircles}
                    onChange={onToggleHotspots}
                    className="w-4 h-4 rounded border-[#94A9BF] text-[#0369A1] focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#CBD8E6] cursor-pointer shadow-2xs hover:border-[#94A9BF]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#0B2540]">Hospital access demand nodes</div>
                    <div className="text-xs text-[#475569]">Neighborhood centroids with reachability</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showHospitalNodes}
                    onChange={onToggleHospitalNodes}
                    className="w-4 h-4 rounded border-[#94A9BF] text-[#991B1B] focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Complete Legend */}
            <div className="space-y-3 pt-2 border-t border-[#CBD8E6]">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Visual Legend
              </span>
              <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] space-y-3.5 text-xs shadow-2xs">
                {/* Utilization scale */}
                <div className="space-y-1.5">
                  <div className="font-bold text-[#0B2540] text-[11px] uppercase tracking-wider">
                    Road Utilization
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold">
                    <div className="py-1 px-1.5 rounded-md bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534]">
                      &lt;70% Normal
                    </div>
                    <div className="py-1 px-1.5 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                      70-100% Heavy
                    </div>
                    <div className="py-1 px-1.5 rounded-md bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B]">
                      &gt;100% Over Cap
                    </div>
                  </div>
                </div>

                {/* Road conditions */}
                <div className="space-y-1.5 pt-2 border-t border-[#CBD8E6]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-0.5 bg-[#991B1B] inline-block border-b-2 border-dashed border-[#991B1B]" />
                    <span className="text-[#1E293B]">Flooded / Blocked road</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-1 bg-[#7C3AED] inline-block rounded-full" />
                    <span className="text-[#1E293B]">Secondary gridlock corridor</span>
                  </div>
                </div>

                {/* Hospital status */}
                <div className="space-y-1.5 pt-2 border-t border-[#CBD8E6]">
                  <div className="font-bold text-[#0B2540] text-[11px] uppercase tracking-wider">
                    Hospital Transit Time
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold">
                    <div className="py-1 px-1.5 rounded-md bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534]">
                      &le;15 min Safe
                    </div>
                    <div className="py-1 px-1.5 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                      15-30 min Delay
                    </div>
                    <div className="py-1 px-1.5 rounded-md bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B]">
                      &gt;30m Golden Hr
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 5: TRAFFIC IMPACT                                       */}
        {/* ============================================================== */}
        {activePanel === "traffic" && (
          <div className="space-y-4">
            {/* KPI Progress Bars */}
            <div className="space-y-3.5 p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Network Metric Bars
              </span>

              {/* 1. Travel Time Change Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#1E293B] font-semibold">Avg trip time</span>
                  <span className="font-mono tabular-nums font-bold text-[#0369A1]">
                    {whatIfScenario?.avgTravelTimeDeltaPct !== undefined
                      ? `${whatIfScenario.avgTravelTimeDeltaPct >= 0 ? "+" : ""}${whatIfScenario.avgTravelTimeDeltaPct}%`
                      : "0%"}
                  </span>
                </div>
                {whatIfScenario?.hasActiveClosures && (
                  <div className="text-[11px] text-[#475569] font-mono flex justify-between">
                    <span>Baseline: {whatIfScenario.baseAvgTravelTimeMin.toFixed(2)} min</span>
                    <span>Scenario: {whatIfScenario.scenarioAvgTravelTimeMin.toFixed(2)} min</span>
                  </div>
                )}
                <div className="h-2.5 rounded-full bg-[#E2E8F0] border border-[#CBD8E6] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (whatIfScenario?.avgTravelTimeDeltaPct || 0) > 30
                        ? "bg-[#991B1B]"
                        : (whatIfScenario?.avgTravelTimeDeltaPct || 0) > 10
                        ? "bg-[#92400E]"
                        : "bg-[#166534]"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (whatIfScenario?.avgTravelTimeDeltaPct || 0) * 1.5))}%`,
                    }}
                  />
                </div>
              </div>

              {/* 2. Disconnected Trips Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#1E293B] font-semibold">Disconnected trips</span>
                  <span className="font-mono tabular-nums font-bold text-[#0B2540]">
                    {whatIfScenario?.tripsDisconnectedPct || 0}%{" "}
                    <span className="text-[#475569] text-[11px] font-normal">
                      ({whatIfScenario?.tripsDisconnected || 0} trips)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E2E8F0] border border-[#CBD8E6] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (whatIfScenario?.tripsDisconnected || 0) > 0 ? "bg-[#991B1B]" : "bg-[#166534]"
                    }`}
                    style={{
                      width: `${Math.min(100, whatIfScenario?.tripsDisconnectedPct || 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Requirement 2: Amber note if more than 20% of trips are disconnected */}
              {whatIfScenario?.hasActiveClosures && (whatIfScenario?.tripsDisconnectedPct || 0) > 20 && (
                <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-medium space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                    <span>Network fragmented</span>
                  </div>
                  <p className="leading-relaxed font-sans text-[11.5px]">
                    Network fragmented: {whatIfScenario.tripsDisconnectedPct}% of trips have no route. The average covers only the remaining trips, so read it with the disconnected share.
                  </p>
                </div>
              )}

              {/* 3. Average Road Utilization Bar */}
              <div className="space-y-2 pt-1 border-t border-[#CBD8E6]">
                {renderUtilizationBar(
                  baselineTraffic?.averageUtilization || 54,
                  whatIfScenario?.scenarioTraffic?.averageUtilization || baselineTraffic?.averageUtilization || 54,
                  "Network average utilization"
                )}
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[#CBD8E6]">
                  <span className="text-[#1E293B] font-semibold">Roads over capacity:</span>
                  <span className="font-mono tabular-nums font-bold text-[#991B1B] text-right">
                    {(whatIfScenario?.tripsDisconnectedPct || 0) > 20
                      ? "Cascade not shown: most flows have no alternative route"
                      : (whatIfScenario?.roadsPushedOverCapacity?.length ?? (whatIfScenario?.hasActiveClosures ? 0 : baselineTraffic?.overloadedRoadsCount || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Trace Ripple in Cascade Button (Primary button: #0369A1 hover #075985) */}
            <button
              type="button"
              onClick={() => onSwitchPanel("cascade")}
              className="w-full py-3 px-4 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-sans font-bold">Trace Ripple in Cascade</span>
              </div>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Roads Pushed Over Capacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0B2540] uppercase tracking-wider text-[11px]">
                  Roads Over Capacity ({whatIfScenario?.roadsPushedOverCapacity?.length || 0})
                </span>
                <span className="text-[11px] text-[#991B1B] font-bold">Overloaded</span>
              </div>

              {whatIfScenario && whatIfScenario.roadsPushedOverCapacity.length > 0 ? (
                <div className="space-y-2">
                  {whatIfScenario.roadsPushedOverCapacity.map((item) => (
                    <div
                      key={item.roadId}
                      className="p-3.5 rounded-xl bg-white border border-[#CBD8E6] space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-[#0B2540] text-xs truncate max-w-[200px]">
                          {item.name}
                        </span>
                        <span className="font-mono tabular-nums text-xs font-bold text-[#991B1B]">
                          {item.scenarioUtilization}%
                        </span>
                      </div>
                      {renderUtilizationBar(item.baselineUtilization, item.scenarioUtilization)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] text-center text-xs text-[#475569]">
                  No roads currently over 100% capacity in this scenario.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 6: CASCADE                                              */}
        {/* ============================================================== */}
        {activePanel === "cascade" && (
          <div className="space-y-4">
            {/* Cascade Step Progression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase">
                  Step Progression
                </span>
                <button
                  type="button"
                  onClick={() => setIsCascadePlaying(!isCascadePlaying)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-xs text-[#0369A1] flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs"
                >
                  {isCascadePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isCascadePlaying ? "Pause" : "Auto play"}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1, title: "Normal", desc: "Baseline state" },
                  { step: 2, title: "Flooding", desc: "Flood blockages" },
                  { step: 3, title: "Gridlock", desc: "Overflow ripple" },
                ].map((s, idx) => {
                  const isCurrent = cascadeStepIndex === idx;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => onSetCascadeStepIndex(idx)}
                      className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer shadow-2xs ${
                        isCurrent
                          ? "bg-[#E0F2FE] border-2 border-[#0369A1] text-[#0B2540] font-bold"
                          : "bg-white border-[#CBD8E6] text-[#475569] hover:text-[#0B2540]"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-[#475569]">
                        Step {s.step}
                      </div>
                      <div className="text-xs font-bold text-[#0B2540] mt-0.5">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-[#475569] truncate mt-0.5">
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Gridlock Roads with before and after utilization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0B2540] uppercase tracking-wider text-[11px]">
                  Secondary Gridlock Corridors (
                  {(whatIfScenario?.tripsDisconnectedPct || 0) > 20
                    ? 0
                    : whatIfScenario?.secondaryGridlockRoads?.length || 0}
                  )
                </span>
                <span className="text-[11px] text-[#7C3AED] font-bold">
                  {(whatIfScenario?.tripsDisconnectedPct || 0) > 20 ? "Fragmented" : "Spillover"}
                </span>
              </div>

              {(whatIfScenario?.tripsDisconnectedPct || 0) > 20 ? (
                <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                    <span>Cascade not shown: most flows have no alternative route</span>
                  </div>
                  <p className="text-xs text-[#92400E] leading-relaxed font-sans">
                    Network fragmented: {whatIfScenario?.tripsDisconnectedPct}% of trips have no route. The average covers only the remaining trips, so read it with the disconnected share.
                  </p>
                </div>
              ) : whatIfScenario?.secondaryGridlockRoads && whatIfScenario.secondaryGridlockRoads.length > 0 ? (
                <div className="space-y-2">
                  {whatIfScenario.secondaryGridlockRoads.map((road) => (
                    <div
                      key={road.roadId}
                      className="p-3.5 rounded-xl bg-white border border-[#CBD8E6] space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-[#0B2540] text-xs truncate max-w-[200px]">
                          {road.name}
                        </span>
                        <span className="font-mono tabular-nums text-xs font-bold text-[#7C3AED]">
                          {road.scenarioUtilization}%
                        </span>
                      </div>
                      {renderUtilizationBar(road.baselineUtilization, road.scenarioUtilization)}
                      <div className="text-[11px] text-[#475569] font-sans flex justify-between pt-1 border-t border-[#CBD8E6]">
                        <span>Rerouted traffic:</span>
                        <span className="text-[#92400E] font-mono font-bold">
                          +{road.trafficSurgeVeh} veh/hr
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] text-center text-xs text-[#475569]">
                  {cascadeStepIndex < 2
                    ? "Advance to Step 3 (Gridlock) to observe secondary spillover."
                    : "No secondary gridlock corridors detected."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANEL 7: HOSPITAL ACCESS                                      */}
        {/* ============================================================== */}
        {activePanel === "hospitals" && (
          <div className="space-y-4">
            {/* Golden Hour Alert Banner (Critical: text #991B1B on #FEE2E2) */}
            {hospitalAccess?.hasGoldenHourBreach ? (
              <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-[#991B1B] text-[13px]">
                  <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0" />
                  <span>Golden Hour Alert Breached</span>
                </div>

                {/* 1. Cut off (no route) areas */}
                {hospitalAccess.cutOffAreas && hospitalAccess.cutOffAreas.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white/75 border border-[#FECACA] space-y-1.5">
                    <div className="font-bold text-[#991B1B] text-[11px] uppercase tracking-wide flex items-center justify-between">
                      <span>Cut off (no route) &bull; {hospitalAccess.cutOffAreas.length} area(s)</span>
                      <span className="text-[10px] text-[#991B1B] font-normal">Corridor severed</span>
                    </div>
                    <div className="space-y-1">
                      {hospitalAccess.cutOffAreas.map((area) => (
                        <div
                          key={`det-cut-${area.id}`}
                          onClick={() => onSelectHospitalArea && onSelectHospitalArea(area.id)}
                          className="flex justify-between items-center text-[12px] p-1.5 rounded hover:bg-[#FEE2E2]/60 cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-[#0B2540] truncate max-w-[170px]">{area.name}</span>
                          <span className="font-bold text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded text-[10.5px]">
                            Cut off &bull; {area.population.toLocaleString()} residents
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Delayed over 30 min areas */}
                {hospitalAccess.delayedAreas && hospitalAccess.delayedAreas.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white/75 border border-[#FECACA] space-y-1.5">
                    <div className="font-bold text-[#92400E] text-[11px] uppercase tracking-wide flex items-center justify-between">
                      <span>Delayed over 30 min &bull; {hospitalAccess.delayedAreas.length} area(s)</span>
                      <span className="text-[10px] text-[#92400E] font-normal">Transit &gt; 30 min</span>
                    </div>
                    <div className="space-y-1">
                      {hospitalAccess.delayedAreas.map((area) => (
                        <div
                          key={`det-del-${area.id}`}
                          onClick={() => onSelectHospitalArea && onSelectHospitalArea(area.id)}
                          className="flex justify-between items-center text-[12px] p-1.5 rounded hover:bg-[#FEE2E2]/60 cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-[#0B2540] truncate max-w-[170px]">{area.name}</span>
                          <span className="font-mono text-[11.5px] text-[#991B1B] font-bold">
                            {area.floodedTimeMin}m (+{area.extraDelayMin}m)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs flex items-center gap-2 font-bold shadow-2xs">
                <Check className="w-4 h-4 text-[#166534] shrink-0" />
                <span>All demand areas have access to emergency care within 30 minutes.</span>
              </div>
            )}

            {/* Affected Areas List with Baseline vs Flooded Bars & 30m Marker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0B2540] uppercase tracking-wider text-[11px]">
                  Monitored Demand Areas ({hospitalAccess?.areas?.length || 0})
                </span>
                <span className="text-[#475569] text-[11px]">Click to highlight route</span>
              </div>

              {hospitalAccess?.areas && hospitalAccess.areas.length > 0 ? (
                <div className="space-y-2.5">
                  {hospitalAccess.areas.map((area) => renderHospitalAccessBar(area))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] text-center text-xs text-[#475569]">
                  No hospital access data available.
                </div>
              )}
            </div>

            {/* Impact Formula Note */}
            <div className="p-3.5 rounded-xl bg-white border border-[#CBD8E6] text-xs text-[#475569] space-y-1 font-sans shadow-2xs">
              <div className="font-bold text-[#0B2540] text-[11px] uppercase tracking-wider">
                Impact Methodology
              </div>
              <div className="font-mono text-[12px] text-[#0369A1] font-bold">
                Impact Score = Extra Travel Time (min) × Area Population
              </div>
              <div className="text-[12px] text-[#475569] leading-relaxed">
                Illustrative metric weighting delay by estimated residential population to prioritize intervention corridors.
              </div>
            </div>

            {/* Healthcare Facilities List */}
            <div className="space-y-2">
              <span className="text-[12px] font-bold text-[#475569] tracking-wider uppercase block">
                Healthcare Facilities
              </span>
              <div className="space-y-2">
                {[
                  { name: "Lok Nayak Jai Prakash Hospital (LNJP)", address: "Delhi Gate, New Delhi", type: "trauma" },
                  { name: "Dr. Ram Manohar Lohia Hospital (RML)", address: "Baba Kharak Singh Marg, Central Delhi", type: "trauma" },
                  { name: "Govind Ballabh Pant Hospital (G.B. Pant)", address: "1, Jawaharlal Nehru Marg, Raj Ghat", type: "trauma" },
                  { name: "Guru Nanak Eye Centre", address: "Maharaja Ranjit Singh Marg", type: "specialty" },
                ].map((hosp, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white border border-[#CBD8E6] text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-[#0B2540] text-[13px]">{hosp.name}</div>
                      <div className="text-[11px] text-[#475569] mt-0.5">{hosp.address}</div>
                    </div>
                    {hosp.type === "specialty" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-bold shrink-0">
                        specialty, not an emergency destination
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] font-bold shrink-0">
                        24/7 Trauma
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
