import React, { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  Layers,
  Hospital as HospitalIcon,
  Award,
  Radio,
  Clock,
  Info,
  ShieldAlert,
  ArrowRight,
  Database,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Droplets,
  CloudRain,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Search,
  ExternalLink,
  AlertOctagon,
  Navigation,
} from "lucide-react";
import { getRoadSpeed, getRoadCapacity } from "../simulation/graph";
import { getMostLoadedRoads } from "../simulation/traffic";
import {
  FLOOD_HOTSPOTS,
  HOTSPOT_DATA_DISCLAIMER,
  RAINFALL_LEVELS,
  getEffectiveRadius,
} from "../data/floodHotspots";
import {
  WhatIfScenarioResult,
  SecondaryGridlockRoad,
  RainfallLevel,
  FloodHotspot,
} from "../simulation/whatIfEngine";
import {
  HospitalAccessAnalysisResult,
  DemandNodeAccess,
} from "../simulation/hospitalAccessibilityEngine";
import BestFixesTab from "./BestFixesTab";

export interface TinyFishSource {
  title: string;
  url: string;
}

export interface TinyFishMatch {
  hotspotName: string;
  sources: TinyFishSource[];
  snippet: string;
}

export interface TinyFishRoadMatch {
  roadName: string;
  sources: TinyFishSource[];
  snippet: string;
}

export interface TinyFishLiveFeedData {
  mode: "live" | "cached";
  areaName?: string;
  fetchedAt: string;
  matches: TinyFishMatch[];
  matchedRoads?: TinyFishRoadMatch[];
  reason?: string;
  error?: string;
}

export type TabKey = "what_if" | "cascade" | "hospital_access";

export interface RightTabsPanelProps {
  roads: any[];
  hospitals: any[];
  graph: any;
  dataSource: "OSM live" | "fallback snapshot";
  loading: boolean;
  selectedRoad?: any;
  onClearSelectedRoad?: () => void;
  baselineTraffic?: any;
  odPairs?: any[];
  // What-If & Cascade Props
  whatIfScenario: WhatIfScenarioResult | null;
  closedRoadIds: Set<string>;
  onToggleRoadClosed: (roadId: string) => void;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string | null) => void;
  selectedHotspotIds?: string[];
  onToggleHotspot?: (hotspotId: string) => void;
  onSelectAllHotspots?: () => void;
  onClearHotspots?: () => void;
  onMonsoonPreset?: () => void;
  onSeverePreset?: () => void;
  rainfallLevel: RainfallLevel;
  onSetRainfallLevel: (level: RainfallLevel) => void;
  onResetClosures: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  cascadeStepIndex: number;
  onSetCascadeStepIndex: (step: number) => void;
  // Hospital Access Props
  hospitalAccess: HospitalAccessAnalysisResult | null;
  selectedHospitalAreaId?: string | null;
  onSelectHospitalArea?: (areaId: string | null) => void;
  // Live Feed & TinyFish Props
  liveFeed?: TinyFishLiveFeedData | null;
  isLiveFeedLoading?: boolean;
  onRefreshLiveFeed?: () => void;
  useLiveTinyFish?: boolean;
  onToggleUseLiveTinyFish?: (active: boolean) => void;
  onSimulateHotspotFix?: (hotspotId: string) => void;
  activeZoneHotspots?: any[];
  currentZone?: any;
}

export default function RightTabsPanel({
  roads,
  hospitals,
  graph,
  dataSource,
  loading,
  selectedRoad,
  onClearSelectedRoad,
  baselineTraffic,
  odPairs = [],
  whatIfScenario,
  closedRoadIds,
  onToggleRoadClosed,
  selectedHotspotId = null,
  onSelectHotspot,
  selectedHotspotIds = [],
  onToggleHotspot,
  onSelectAllHotspots,
  onClearHotspots,
  onMonsoonPreset,
  onSeverePreset,
  rainfallLevel,
  onSetRainfallLevel,
  onResetClosures,
  activeTab,
  onTabChange,
  cascadeStepIndex,
  onSetCascadeStepIndex,
  hospitalAccess,
  selectedHospitalAreaId,
  onSelectHospitalArea,
  liveFeed = null,
  isLiveFeedLoading = false,
  onRefreshLiveFeed,
  useLiveTinyFish = false,
  onToggleUseLiveTinyFish,
  onSimulateHotspotFix,
  activeZoneHotspots,
  currentZone,
}: RightTabsPanelProps) {
  const [roadSearch, setRoadSearch] = useState<string>("");
  const [isCascadePlaying, setIsCascadePlaying] = useState<boolean>(false);

  // Auto-play animation timer for cascade steps (1 -> 2 -> 3)
  useEffect(() => {
    if (!isCascadePlaying) return;
    const interval = setInterval(() => {
      onSetCascadeStepIndex((cascadeStepIndex + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [isCascadePlaying, cascadeStepIndex, onSetCascadeStepIndex]);

  const roadCount = roads.length;
  const nodeCount = graph?.stats?.nodeCount || 0;
  const hospitalCount = hospitals.length;

  const currentHotspots = useMemo(() => {
    if (activeZoneHotspots !== undefined) return activeZoneHotspots;
    return FLOOD_HOTSPOTS;
  }, [activeZoneHotspots]);

  const effectiveSelectedHotspotIds = useMemo(() => {
    if (selectedHotspotIds && selectedHotspotIds.length > 0) return selectedHotspotIds;
    if (selectedHotspotId) return [selectedHotspotId];
    return [];
  }, [selectedHotspotIds, selectedHotspotId]);

  const avgTravelTime = baselineTraffic?.averageTravelTimeMinutes ?? 0;
  const percentOverloaded = baselineTraffic?.percentOverCapacity ?? 0;
  const overloadedCount = baselineTraffic?.overloadedRoadsCount ?? 0;
  const totalDemand = baselineTraffic?.totalVehicles ?? 0;

  const topBottlenecks = baselineTraffic?.roadStats
    ? getMostLoadedRoads(baselineTraffic.roadStats, 5)
    : [];

  const selectedRoadStat =
    selectedRoad && baselineTraffic?.roadStats
      ? baselineTraffic.roadStats[selectedRoad.id]
      : null;

  const isSelectedRoadClosed = selectedRoad && closedRoadIds.has(String(selectedRoad.id));

  // Filtered roads for the manual closure picker
  const filteredRoads = roads
    .filter((r) => {
      if (!roadSearch.trim()) return true;
      const q = roadSearch.toLowerCase();
      return (
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.highway && r.highway.toLowerCase().includes(q)) ||
        String(r.id).includes(q)
      );
    })
    .slice(0, 15);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      key: "what_if",
      label: "What-If",
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      badge: whatIfScenario?.hasActiveClosures ? "ACTIVE" : undefined,
    },
    {
      key: "cascade",
      label: "Cascade",
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: whatIfScenario?.secondaryGridlockRoads?.length
        ? `${whatIfScenario.secondaryGridlockRoads.length} RIPPLE`
        : undefined,
    },
    {
      key: "hospital_access",
      label: "Hospital Access",
      icon: <HospitalIcon className="w-3.5 h-3.5" />,
      badge: hospitalAccess?.hasGoldenHourBreach
        ? `${hospitalAccess.goldenHourBreachedAreas.length} >30m`
        : undefined,
    },
  ];

  return (
    <aside className="w-full lg:w-96 xl:w-[420px] h-full flex flex-col bg-[#0c1017] border-l border-[#1a2434] shrink-0 z-20 overflow-hidden font-mono text-xs">
      {/* Tab Navigation */}
      <div className="bg-[#0e131d] border-b border-[#182333] p-1.5 shrink-0">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded transition-all text-center cursor-pointer relative ${
                  isActive
                    ? "bg-[#182335] text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#141b26]"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] truncate max-w-full leading-tight">{tab.label}</span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-0.5 px-1 py-0.2 rounded-full text-[8px] bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Selected Road Inspector (Always visible if a road is clicked on map) */}
        {selectedRoad && (
          <div className="p-3 rounded bg-[#131b28] border border-cyan-500/50 space-y-2 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                  ACTIVE MAP SELECTION
                </span>
                <h4 className="font-bold text-white text-xs mt-0.5">
                  {selectedRoad.name || "Unnamed Corridor"}
                </h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleRoadClosed(String(selectedRoad.id))}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    isSelectedRoadClosed
                      ? "bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-600"
                      : "bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700"
                  }`}
                >
                  {isSelectedRoadClosed ? "REOPEN ROAD" : "CLOSE ROAD"}
                </button>
                {onClearSelectedRoad && (
                  <button
                    type="button"
                    onClick={onClearSelectedRoad}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-[#1b2638] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-[#1e2d42]">
              <div>
                <span className="text-slate-400 uppercase">Class: </span>
                <span className="text-slate-200 capitalize font-semibold">{selectedRoad.highway}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase">Lanes: </span>
                <span className="text-slate-200 font-semibold">{selectedRoad.lanes || 1}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase">Design Cap: </span>
                <span className="text-slate-200">
                  {getRoadCapacity(selectedRoad.highway, selectedRoad.lanes)} veh/hr
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase">Speed: </span>
                <span className="text-slate-200">{getRoadSpeed(selectedRoad.highway)} km/h</span>
              </div>
            </div>

            {selectedRoadStat && (
              <div className="p-2 bg-[#090d14] rounded border border-[#1b2536] space-y-1 text-[10.5px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Baseline Utilization:</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      selectedRoadStat.utilization > 100
                        ? "bg-rose-950 text-rose-300 border border-rose-700"
                        : selectedRoadStat.utilization >= 70
                        ? "bg-amber-950 text-amber-300 border border-amber-700"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                    }`}
                  >
                    {selectedRoadStat.utilization}% ({selectedRoadStat.traffic} veh/hr)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Congested Travel Time:</span>
                  <span className="text-slate-200">{selectedRoadStat.congestedMinutes} min</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: WHAT-IF ENGINE                                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "what_if" && (
          <div className="space-y-4">
            {/* Header Description */}
            <div className="p-3.5 rounded bg-[#10151f] border border-[#1d2737] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>WHAT-IF FLOOD SCENARIO ENGINE</span>
                </div>
                {whatIfScenario?.hasActiveClosures && (
                  <button
                    type="button"
                    onClick={onResetClosures}
                    className="text-[10px] text-rose-400 hover:text-rose-200 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                    RESET
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Pick a public waterlogging hotspot or click any road corridor to simulate flood-induced link severance and recalculate network traffic diversion.
              </p>
            </div>

            {/* Live Feed Banner when TinyFish active */}
            {useLiveTinyFish && (
              <div className="p-2.5 rounded bg-cyan-950/90 border border-cyan-400 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="font-bold text-[11px]">Using live TinyFish conditions</span>
                </div>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-cyan-900 border border-cyan-600 font-bold text-cyan-100">
                  {whatIfScenario?.floodedHotspots?.length || 0} Hotspots Flooded
                </span>
              </div>
            )}

            {/* SUMMARY SENTENCE & FLOODED HOTSPOTS LIST */}
            {whatIfScenario && (
              <div
                className={`p-3 rounded border space-y-2 transition-all ${
                  whatIfScenario.hasActiveClosures
                    ? "bg-[#18111e] border-rose-600/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    : "bg-[#0b1017] border-[#1d2a3e]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles
                      className={`w-3.5 h-3.5 ${
                        whatIfScenario.hasActiveClosures ? "text-amber-400" : "text-cyan-400"
                      }`}
                    />
                    <span
                      className={
                        whatIfScenario.hasActiveClosures ? "text-rose-300" : "text-slate-400"
                      }
                    >
                      SCENARIO IMPACT SUMMARY
                    </span>
                  </div>
                  {whatIfScenario.floodedHotspots.length > 0 && (
                    <span className="text-[9.5px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold font-mono">
                      {whatIfScenario.floodedHotspots.length} HOTSPOT{whatIfScenario.floodedHotspots.length > 1 ? "S" : ""} FLOODED
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-white leading-relaxed font-sans">
                  {whatIfScenario.summarySentence}
                </div>

                {/* Flooded Hotspots List in Impact Summary */}
                {whatIfScenario.floodedHotspots.length > 0 && (
                  <div className="p-2.5 rounded bg-[#0e0714] border border-rose-800/60 space-y-1.5">
                    <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center justify-between font-mono">
                      <span>Flooded Hotspots ({whatIfScenario.floodedHotspots.length}):</span>
                      <span className="text-amber-400 font-semibold">{rainfallLevel} rainfall</span>
                    </div>
                    <ul className="space-y-1 text-slate-200 text-xs">
                      {whatIfScenario.floodedHotspots.map((h) => (
                        <li key={h.id || h.name} className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-semibold text-white flex items-center gap-1.5 truncate max-w-[250px]">
                            <Droplets className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{h.name}</span>
                          </span>
                          <span className="text-[9.5px] font-mono text-cyan-400 shrink-0">
                            {getEffectiveRadius(h, rainfallLevel)}m radius
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {whatIfScenario.disconnectedPenaltyMin > 0 && (
                  <div className="p-1.5 rounded bg-[#100812] border border-amber-600/40 text-[10px] text-amber-300 font-mono flex items-center justify-between">
                    <span>Disconnected trip penalty (separate):</span>
                    <span className="font-bold">+{whatIfScenario.disconnectedPenaltyMin} min (illustrative)</span>
                  </div>
                )}
                <div className="text-[9.5px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#261f30]">
                  <span>Demand-weighted average over connected trips</span>
                  <span className="text-amber-400 font-mono">illustrative</span>
                </div>
              </div>
            )}

            {/* SELECTION CONTROLS: Hotspots Multi-Select & Presets */}
            <div className="p-3.5 rounded bg-[#0f1420] border border-[#1c293d] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. WATERLOGGING HOTSPOTS</span>
                </span>
                <span className="text-[9.5px] font-mono text-cyan-400 font-bold">
                  {effectiveSelectedHotspotIds.length} of {currentHotspots.length} selected
                </span>
              </div>

              {/* Event Presets: Monsoon storm (3 hotspots) & Severe storm (all hotspots) */}
              <div className="space-y-1.5">
                <div className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider">
                  Event Presets:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onMonsoonPreset}
                    disabled={useLiveTinyFish}
                    className="px-2.5 py-2 rounded bg-[#161a24] hover:bg-[#1e2536] border border-amber-500/60 text-amber-300 hover:text-amber-200 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 text-left"
                    title="Check Minto Bridge Railway Underpass, ITO / Vikas Marg and Tilak Bridge underpass at Extreme rainfall"
                  >
                    <CloudRain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="leading-tight">Monsoon storm (3 hotspots)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onSeverePreset}
                    disabled={useLiveTinyFish}
                    className="px-2.5 py-2 rounded bg-[#161a24] hover:bg-[#1e2536] border border-rose-500/60 text-rose-300 hover:text-rose-200 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 text-left"
                    title="Check all waterlogging hotspots at Extreme rainfall"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="leading-tight">Worst-case stress test (all hotspots flooded)</span>
                  </button>
                </div>
              </div>

              {/* Select All & Clear actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onSelectAllHotspots}
                    disabled={useLiveTinyFish || currentHotspots.length === 0}
                    className="px-2.5 py-1 rounded bg-[#131d2b] hover:bg-[#1b293d] border border-[#23354d] text-slate-200 hover:text-white text-[10.5px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={onClearHotspots}
                    disabled={useLiveTinyFish || effectiveSelectedHotspotIds.length === 0}
                    className="px-2.5 py-1 rounded bg-[#131d2b] hover:bg-[#1b293d] border border-[#23354d] text-slate-400 hover:text-rose-300 text-[10.5px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
                <span className="text-[9.5px] text-slate-400 font-mono">
                  {effectiveSelectedHotspotIds.length > 0
                    ? `${effectiveSelectedHotspotIds.length} active`
                    : "0 active"}
                </span>
              </div>

              {/* Hotspot Checkbox List (the 9 hotspots in Central Delhi) */}
              {currentHotspots.length === 0 ? (
                <div className="p-3 rounded bg-[#090d14] border border-[#23354c] space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>NO KNOWN WATERLOGGING HOTSPOTS</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    No known waterlogging hotspots in this zone. Close roads manually or use Live Feed.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {currentHotspots.map((h: any) => {
                    const isChecked = effectiveSelectedHotspotIds.includes(h.id);
                    return (
                      <label
                        key={h.id || h.name}
                        className={`flex items-start gap-2.5 p-2 rounded border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-[#181122] border-rose-500/80 text-white shadow-sm"
                            : "bg-[#090d14] border-[#1d293d] text-slate-300 hover:bg-[#111825] hover:text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={useLiveTinyFish}
                          onChange={() => {
                            if (onToggleHotspot) {
                              onToggleHotspot(h.id);
                            } else if (onSelectHotspot) {
                              onSelectHotspot(isChecked ? null : h.id);
                            }
                          }}
                          className="mt-0.5 w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs truncate">{h.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 font-bold ${
                                isChecked
                                  ? "bg-rose-950 text-rose-300 border border-rose-700"
                                  : "bg-[#141d2a] text-cyan-400 border border-[#203045]"
                              }`}
                            >
                              {h.radiusMeters}m
                            </span>
                          </div>
                          {h.aliases && h.aliases.length > 0 && (
                            <div className="text-[9.5px] text-slate-400 truncate mt-0.5 font-sans">
                              {h.aliases[0]}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="text-[9.5px] text-amber-300/80 italic pt-0.5">
                &bull; {HOTSPOT_DATA_DISCLAIMER}
              </div>

              {/* Rainfall Level Selector */}
              <div className="pt-2 border-t border-[#1a2538] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                    <span>2. RAINFALL SEVERITY</span>
                  </span>
                  <span className="text-[9px] text-slate-400">Flood Inundation Radius</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Moderate", "Heavy", "Extreme"] as RainfallLevel[]).map((level) => {
                    const cfg = (RAINFALL_LEVELS as any)[level];
                    const isSelected = rainfallLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onSetRainfallLevel(level)}
                        className={`py-2 px-1 rounded text-center transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 font-bold shadow-sm"
                            : "bg-[#090d14] border-[#1f2c40] text-slate-400 hover:text-slate-200 hover:bg-[#121927]"
                        }`}
                      >
                        <div className="text-[11px] font-bold">{level}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {Math.round(cfg.multiplier * 100)}% radius
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SELECTION CONTROL: Manual Corridor Closures */}
            <div className="p-3.5 rounded bg-[#0f1420] border border-[#1c293d] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. MANUAL CORRIDOR CLOSURES</span>
                </span>
                <span className="text-[9.5px] font-bold text-rose-400">
                  {closedRoadIds.size} manually closed
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Click any road directly on the map or toggle key Central Delhi corridors below:
              </p>

              {/* Road Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter corridor by name or class..."
                  value={roadSearch}
                  onChange={(e) => setRoadSearch(e.target.value)}
                  className="w-full bg-[#080c14] border border-[#1e2a3c] rounded pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              {/* Road list items */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {filteredRoads.map((r) => {
                  const isClosed = closedRoadIds.has(String(r.id));
                  return (
                    <div
                      key={r.id}
                      className={`p-2 rounded border flex items-center justify-between text-xs transition-colors ${
                        isClosed
                          ? "bg-rose-950/40 border-rose-700/80 text-rose-200"
                          : "bg-[#090d14] border-[#182333] hover:border-slate-600 text-slate-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate text-[11px]">
                          {r.name || "Unnamed Corridor"}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">
                          {r.highway} &bull; {getRoadSpeed(r.highway)} km/h
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleRoadClosed(String(r.id))}
                        className={`px-2 py-1 rounded text-[9.5px] font-bold shrink-0 cursor-pointer transition-colors ${
                          isClosed
                            ? "bg-rose-900 text-white hover:bg-rose-800"
                            : "bg-[#141e2e] text-slate-300 hover:text-white hover:bg-cyan-900/40 border border-[#23354c]"
                        }`}
                      >
                        {isClosed ? "CLOSED ✕" : "CLOSE"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COMPUTED IMPACT METRICS */}
            {whatIfScenario && (
              <div className="p-3.5 rounded bg-[#101520] border border-[#1f2c40] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1b2638] pb-1.5">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>TRAFFIC ASSIGNMENT IMPACTS</span>
                  </span>
                  <span className="text-[9px] text-emerald-400">BPR Congestion Re-routed</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded bg-[#090d14] border border-[#1a2538] text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Travel Time Δ</span>
                    <span
                      className={`text-xs font-bold tabular-nums block mt-0.5 ${
                        whatIfScenario.avgTravelTimeDeltaPct > 0
                          ? "text-rose-400"
                          : whatIfScenario.avgTravelTimeDeltaPct < 0
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {whatIfScenario.baseAvgTravelTimeMin.toFixed(2)}m → {whatIfScenario.scenarioAvgTravelTimeMin.toFixed(2)}m
                    </span>
                    <span className="text-[9.5px] text-amber-300 font-bold block">
                      +{whatIfScenario.avgTravelTimeDeltaPct}%
                    </span>
                    <span className="text-[8px] text-slate-500">connected trips</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#090d14] border border-[#1a2538] text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Disconnected</span>
                    <span
                      className={`text-sm font-bold tabular-nums block mt-0.5 ${
                        whatIfScenario.tripsDisconnected > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {whatIfScenario.tripsDisconnected}
                    </span>
                    <span className="text-[9.5px] text-amber-300 font-bold block">
                      {whatIfScenario.tripsDisconnectedPct}% of trips
                    </span>
                    <span className="text-[8px] text-slate-500">illustrative</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#090d14] border border-[#1a2538] text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Pushed Over Cap</span>
                    <span
                      className={`text-base font-bold tabular-nums block mt-0.5 ${
                        whatIfScenario.tripsDisconnectedPct > 20
                          ? "text-amber-400 text-xs"
                          : whatIfScenario.roadsPushedOverCapacity.length > 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {whatIfScenario.tripsDisconnectedPct > 20
                        ? "Not shown"
                        : whatIfScenario.roadsPushedOverCapacity.length}
                    </span>
                    <span className="text-[8.5px] text-slate-500">
                      {whatIfScenario.tripsDisconnectedPct > 20 ? ">20% disconnected" : "secondary gridlock"}
                    </span>
                  </div>
                </div>

                {/* Requirement 2: Amber note when >20% disconnected */}
                {whatIfScenario.tripsDisconnectedPct > 20 && (
                  <div className="p-2.5 rounded bg-amber-950/70 border border-amber-600/80 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2 font-sans">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Network fragmented: {whatIfScenario.tripsDisconnectedPct}% of trips have no route. The average covers only the remaining trips, so read it with the disconnected share.
                    </span>
                  </div>
                )}

                {/* Roads pushed over capacity breakdown */}
                {whatIfScenario.roadsPushedOverCapacity.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-300 uppercase">
                        ROADS PUSHED OVER CAPACITY ({whatIfScenario.roadsPushedOverCapacity.length})
                      </span>
                      <span className="text-[9px] text-amber-300">detour ripple</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {whatIfScenario.roadsPushedOverCapacity.map((item) => (
                        <div
                          key={item.roadId}
                          className="p-2 rounded bg-[#080c14] border border-rose-900/60 text-[10.5px] space-y-1"
                        >
                          <div className="flex justify-between items-start font-semibold text-white">
                            <span className="truncate pr-1">{item.name}</span>
                            <span className="text-rose-400 font-bold shrink-0">
                              {item.scenarioUtilization}% util
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>
                              Baseline: <strong className="text-slate-300">{item.baselineUtilization}%</strong>
                            </span>
                            <span className="text-amber-300">
                              Surge: +{item.trafficSurgeVeh} veh/hr (+{item.utilizationSurgePct}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic text-center py-1">
                    {whatIfScenario.hasActiveClosures
                      ? "No auxiliary roads exceeded 100% capacity under this specific severance."
                      : "Trigger a corridor closure above to detect diverted bottleneck ripple."}
                  </div>
                )}

                {/* Jump to Cascade View button */}
                <button
                  type="button"
                  onClick={() => onTabChange("cascade")}
                  className="w-full py-2 px-3 rounded bg-[#162338] hover:bg-[#1d2f4a] border border-cyan-500/50 text-cyan-200 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span>Trace Ripple in Cascade Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CASCADE STEP-BY-STEP                                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "cascade" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded bg-[#121620] border border-[#1e2736] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>CASCADE RIPPLE SIMULATION</span>
                </div>
                {whatIfScenario?.hasActiveClosures && (
                  <button
                    type="button"
                    onClick={() => setIsCascadePlaying(!isCascadePlaying)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#192436] hover:bg-[#203046] border border-[#2b3e5a] text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    {isCascadePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isCascadePlaying ? "PAUSE" : "AUTO PLAY"}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Step-by-step trace of how primary flood underpass severances force traffic onto parallel corridors, pushing previously free-flowing roads into secondary gridlock.
              </p>
            </div>

            {/* SUMMARY SENTENCE */}
            {whatIfScenario && (
              <div className="p-3 rounded bg-[#160f1b] border border-rose-600/70 space-y-1">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>CASCADE SYSTEM SUMMARY</span>
                </div>
                <div className="text-xs font-semibold text-white leading-relaxed font-sans">
                  {whatIfScenario.summarySentence}
                </div>
              </div>
            )}

            {/* STEP-BY-STEP SLIDER & CONTROLS */}
            {whatIfScenario?.cascadeSteps && whatIfScenario.cascadeSteps.length > 0 ? (
              <div className="p-3.5 rounded bg-[#0e1420] border border-[#1d2a3f] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    STEP PROGRESSION (3 STEPS)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    Step {cascadeStepIndex + 1} of 3
                  </span>
                </div>

                {/* 3 Step Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  {whatIfScenario.cascadeSteps.map((stepItem, idx) => {
                    const isCurrent = cascadeStepIndex === idx;
                    return (
                      <button
                        key={stepItem.step}
                        type="button"
                        onClick={() => onSetCascadeStepIndex(idx)}
                        className={`p-2 rounded text-left transition-all border cursor-pointer ${
                          isCurrent
                            ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                            : "bg-[#090d14] border-[#1a2538] hover:border-slate-600 opacity-80"
                        }`}
                      >
                        <div
                          className={`text-[9.5px] font-bold uppercase truncate ${
                            isCurrent ? "text-cyan-300" : "text-slate-400"
                          }`}
                        >
                          Step {stepItem.step}
                        </div>
                        <div className="text-[11px] font-semibold text-white truncate mt-0.5">
                          {idx === 0 ? "Normal" : idx === 1 ? "Link Floods" : "Secondary"}
                        </div>
                        <span
                          className={`inline-block mt-1 px-1 py-0.2 rounded text-[8px] font-bold ${
                            idx === 2
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : idx === 1
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          {stepItem.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Slider bar */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={cascadeStepIndex}
                    onChange={(e) => onSetCascadeStepIndex(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>1. Normal Flow</span>
                    <span>2. Link Floods & Shifts</span>
                    <span>3. Secondary Gridlock</span>
                  </div>
                </div>

                {/* Active Step Details Card */}
                {whatIfScenario.cascadeSteps[cascadeStepIndex] && (
                  <div className="p-3 rounded bg-[#090d14] border border-[#1e2a3c] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span>{whatIfScenario.cascadeSteps[cascadeStepIndex].title}</span>
                      </h4>
                      <span className="text-[10px] text-cyan-300 font-bold">
                        {whatIfScenario.cascadeSteps[cascadeStepIndex].travelTimeDeltaPct >= 0
                          ? `+${whatIfScenario.cascadeSteps[cascadeStepIndex].travelTimeDeltaPct}%`
                          : `${whatIfScenario.cascadeSteps[cascadeStepIndex].travelTimeDeltaPct}%`}{" "}
                        Time
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {whatIfScenario.cascadeSteps[cascadeStepIndex].description}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] pt-1.5 border-t border-[#182333]">
                      <div>
                        <span className="text-slate-500 uppercase block">Travel Time:</span>
                        <span className="font-bold text-white tabular-nums">
                          {whatIfScenario.cascadeSteps[cascadeStepIndex].avgTravelTimeMin.toFixed(2)} min
                        </span>
                        <span className="text-[8.5px] text-amber-300 block">
                          +{whatIfScenario.cascadeSteps[cascadeStepIndex].travelTimeDeltaPct}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">Disconnected:</span>
                        <span className="font-bold text-amber-400 tabular-nums">
                          {whatIfScenario.cascadeSteps[cascadeStepIndex].disconnectedTrips}
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          {whatIfScenario.cascadeSteps[cascadeStepIndex].disconnectedTripsPct || 0}% of trips
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">Overloaded:</span>
                        <span className="font-bold text-rose-400 tabular-nums">
                          {whatIfScenario.cascadeSteps[cascadeStepIndex].overloadedRoadsCount}
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">corridors</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded bg-[#0e1420] border border-[#1a2538] text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-bold text-slate-300">No Active Severance</div>
                <p className="text-[11px] text-slate-400 font-sans max-w-xs mx-auto">
                  Select a public flood hotspot or click any corridor in the What-If tab to trace its ripple through the road network.
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange("what_if")}
                  className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-300 text-xs font-bold cursor-pointer"
                >
                  Go to What-If Tab
                </button>
              </div>
            )}

            {/* SECONDARY GRIDLOCK CORRIDORS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${(whatIfScenario?.tripsDisconnectedPct ?? 0) > 20 ? "bg-amber-500" : "bg-rose-500 animate-ping"}`} />
                  <span>
                    SECONDARY GRIDLOCK CORRIDORS (
                    {(whatIfScenario?.tripsDisconnectedPct ?? 0) > 20
                      ? 0
                      : whatIfScenario?.secondaryGridlockRoads?.length || 0}
                    )
                  </span>
                </span>
                <span className="text-[9px] text-amber-400">
                  {(whatIfScenario?.tripsDisconnectedPct ?? 0) > 20 ? "Fragmented" : "Pushed >100% Cap"}
                </span>
              </div>

              {(whatIfScenario?.tripsDisconnectedPct ?? 0) > 20 ? (
                <div className="p-3.5 rounded bg-[#160f1b] border border-amber-600/70 space-y-1.5 shadow-sm">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cascade not shown: most flows have no alternative route</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Network fragmented: {whatIfScenario?.tripsDisconnectedPct}% of trips have no route. The average covers only the remaining trips, so read it with the disconnected share.
                  </p>
                </div>
              ) : whatIfScenario?.secondaryGridlockRoads &&
              whatIfScenario.secondaryGridlockRoads.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {whatIfScenario.secondaryGridlockRoads.map((road) => (
                    <div
                      key={road.roadId}
                      className="p-2.5 rounded bg-[#130d17] border border-rose-600/80 space-y-1.5 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-1">
                          <span className="font-bold text-white text-xs block truncate">
                            {road.name}
                          </span>
                          <span className="text-[9.5px] text-slate-400 uppercase">
                            {road.highway} &bull; Capacity: {road.capacity} veh/hr
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-rose-950 text-rose-300 border border-rose-700 font-bold shrink-0">
                          {road.scenarioUtilization}% UTIL
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#09070c] border border-[#231220] grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Baseline Util:</span>
                          <span className="text-emerald-400 font-bold">
                            {road.baselineUtilization}% (Nominal)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Diversion Surge:</span>
                          <span className="text-amber-300 font-bold">
                            +{road.trafficSurgeVeh} veh/hr (+{road.utilizationSurgePct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Congested Time:</span>
                          <span className="text-white font-bold">
                            {road.scenarioTimeMin} min
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Delay Growth:</span>
                          <span className="text-rose-400 font-bold">
                            +{road.delayIncreaseMin} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded bg-[#0a0e16] border border-[#162130] text-center text-[11px] text-slate-500">
                  {whatIfScenario?.hasActiveClosures
                    ? "Detour traffic distributed evenly; no parallel road was pushed beyond 100% capacity."
                    : "No secondary gridlock active. Inundate a hotspot to evaluate detour overloads."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: HOSPITAL ACCESS                                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "hospital_access" && (
          <div className="space-y-4">
            {/* Header Description */}
            <div className="p-3.5 rounded bg-[#150f19] border border-rose-900/60 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#2b1725] pb-1.5">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HospitalIcon className="w-3.5 h-3.5 text-rose-400" />
                  <span>EMERGENCY HOSPITAL REACHABILITY</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  Golden Hour (&le; 30 min)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Evaluates emergency reachability from Central Delhi demand centroids to nearest tertiary trauma hospitals in baseline and under current flood severance.
              </p>
            </div>

            {/* If no hospitals found near this area */}
            {hospitals.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 text-xs font-sans space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 uppercase font-mono text-[11.5px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No Hospitals Detected Nearby</span>
                </div>
                <p className="leading-relaxed text-[12px] text-amber-100 font-medium">
                  No hospitals found near this area, so hospital access cannot be computed.
                </p>
                <div className="text-[10.5px] text-amber-300/80 font-mono">
                  (OpenStreetMap query searched within the selected area plus a 3 km emergency buffer)
                </div>
              </div>
            ) : (
              <>
            {/* GOLDEN HOUR ALERT BANNER */}
            {hospitalAccess?.hasGoldenHourBreach ? (
              <div className="p-3.5 rounded bg-rose-950/90 border-2 border-rose-600 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.35)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                  <span>⚠️ GOLDEN HOUR ALERT: SEVERE EMERGENCY TRANSIT DELAY</span>
                </div>

                {/* 1. Cut off (no route) areas */}
                {hospitalAccess.cutOffAreas && hospitalAccess.cutOffAreas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>Cut off (no route) &bull; {hospitalAccess.cutOffAreas.length} sector(s)</span>
                      </span>
                      <span className="text-[10px] text-rose-300/80 font-normal">Corridor severed</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {hospitalAccess.cutOffAreas.map((area) => (
                        <div
                          key={`cutoff-${area.id}`}
                          onClick={() => onSelectHospitalArea && onSelectHospitalArea(area.id)}
                          className="p-2 rounded bg-rose-900/90 border border-rose-500/90 flex justify-between items-center text-xs hover:bg-rose-800 cursor-pointer transition-colors"
                          title="Click to view route on map"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-white block truncate">{area.name}</span>
                            <span className="text-[9.5px] text-rose-300">
                              Trauma corridor impassable
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-400 text-[10.5px] font-black uppercase">
                              Cut off
                            </span>
                            <span className="text-[9.5px] text-rose-300 font-bold block mt-0.5">
                              {area.population.toLocaleString()} residents
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Delayed over 30 min areas */}
                {hospitalAccess.delayedAreas && hospitalAccess.delayedAreas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Delayed over 30 min &bull; {hospitalAccess.delayedAreas.length} sector(s)</span>
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-normal">Transit &gt; 30 min</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {hospitalAccess.delayedAreas.map((area) => (
                        <div
                          key={`delayed-${area.id}`}
                          onClick={() => onSelectHospitalArea && onSelectHospitalArea(area.id)}
                          className="p-2 rounded bg-rose-900/70 border border-rose-600/80 flex justify-between items-center text-xs hover:bg-rose-800 cursor-pointer transition-colors"
                          title="Click to view baseline vs flooded route on map"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-white block truncate">{area.name}</span>
                            <span className="text-[9.5px] text-rose-300">
                              To {area.floodedHospital?.name || area.baselineHospital.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-rose-100 text-xs block">
                              {area.floodedTimeMin} min
                            </span>
                            <span className="text-[9px] text-amber-300 font-bold">
                              +{area.extraDelayMin} min delay
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[9.5px] text-rose-300/90 font-mono pt-1 border-t border-rose-800 flex justify-between">
                  <span>Emergency transit exceeds 30-min window</span>
                  <span className="text-amber-300">illustrative model</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded bg-[#0b1612] border border-emerald-800/80 text-emerald-300 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Golden Hour Maintained (&le; 30 min)</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                    ALL 12 SECTORS SAFE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  All Central Delhi demand nodes maintain rapid emergency transit to a tertiary hospital under current conditions.
                </p>
              </div>
            )}

            {/* METRIC CARD */}
            <div className="p-3 rounded bg-[#0d121c] border border-[#1b2639] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>IMPACT METRIC FORMULA</span>
                </span>
                <span className="text-[9px] text-amber-300 font-mono">illustrative</span>
              </div>
              <div className="p-2 rounded bg-[#070a12] border border-[#172233] text-[11px] space-y-1">
                <div className="font-mono text-cyan-300 font-bold">
                  Impact Score = Population Weight &times; Extra Delay (min)
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Quantifies societal emergency loss in person-minutes of transit delay to critical trauma care.
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded bg-[#080d16] border border-[#182335]">
                  <span className="text-[9px] text-slate-500 uppercase block">Avg Baseline</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {hospitalAccess?.avgBaselineTimeMin ?? 0} min
                  </span>
                </div>
                <div className="p-2 rounded bg-[#080d16] border border-[#182335]">
                  <span className="text-[9px] text-slate-500 uppercase block">Avg Flooded</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      (hospitalAccess?.avgExtraDelayMin ?? 0) > 0 ? "text-rose-400" : "text-white"
                    }`}
                  >
                    {hospitalAccess?.avgFloodedTimeMin ?? 0} min
                  </span>
                </div>
                <div className="p-2 rounded bg-[#080d16] border border-[#182335]">
                  <span className="text-[9px] text-slate-500 uppercase block">Avg Extra Delay</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      (hospitalAccess?.avgExtraDelayMin ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    +{(hospitalAccess?.avgExtraDelayMin ?? 0)} min
                  </span>
                </div>
              </div>
            </div>

            {/* ROUTE COMPARISON CALLOUT */}
            {selectedHospitalAreaId && (
              (() => {
                const sel = hospitalAccess?.areas.find((a) => a.id === selectedHospitalAreaId);
                if (!sel) return null;
                return (
                  <div className="p-3 rounded bg-[#131b2b] border border-cyan-500/80 space-y-2 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>ACTIVE ROUTE COMPARISON</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectHospitalArea && onSelectHospitalArea(null)}
                        className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-[#1d273a] cursor-pointer"
                      >
                        CLOSE ✕
                      </button>
                    </div>
                    <div className="text-xs font-bold text-white">{sel.name}</div>
                    <div className="space-y-1.5 text-[11px] pt-1 border-t border-[#1e2a3f]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-1 rounded bg-[#06b6d4]" />
                          <span>Baseline Route:</span>
                        </span>
                        <strong className="text-cyan-300 font-mono">
                          {sel.baselineTimeMin} min ({sel.baselineHospital.name})
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-1 rounded bg-[#f43f5e] border border-dashed border-white" />
                          <span>Flooded Route:</span>
                        </span>
                        <strong
                          className={`font-mono ${
                            sel.isGoldenHourBreached ? "text-rose-400" : "text-amber-300"
                          }`}
                        >
                          {sel.floodedTimeMin} min (+{sel.extraDelayMin} min delay)
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-[#182335]">
                        <span>Synthetic Population:</span>
                        <span className="text-slate-200">
                          {sel.population.toLocaleString()} residents (illustrative)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-amber-300">
                        <span>Impact Score:</span>
                        <span className="font-bold font-mono">
                          {sel.impactScore.toLocaleString()} person-min
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* MOST AFFECTED AREAS LIST */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>MOST AFFECTED AREAS (SORTED BY POP &times; DELAY)</span>
                </span>
                <span className="text-[9px] text-slate-400">12 Centroids</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {hospitalAccess?.mostAffectedAreas && hospitalAccess.mostAffectedAreas.length > 0 ? (
                  hospitalAccess.mostAffectedAreas.map((area, index) => {
                    const isSelected = selectedHospitalAreaId === area.id;
                    return (
                      <div
                        key={area.id}
                        onClick={() => onSelectHospitalArea && onSelectHospitalArea(area.id)}
                        className={`p-3 rounded border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "bg-[#162133] border-cyan-400 shadow-md"
                            : "bg-[#0d121c] border-[#1a2538] hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-[#151c28] border border-[#233045] flex items-center justify-center font-bold text-[10px] text-slate-400 shrink-0">
                              #{index + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-white text-xs block truncate">
                                {area.name}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block mt-0.5">
                                {area.population.toLocaleString()} residents (synthetic, illustrative)
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase border ${
                              area.isGoldenHourBreached
                                ? "bg-rose-950 text-rose-300 border-rose-700 animate-pulse"
                                : area.statusColor === "#f59e0b"
                                ? "bg-amber-950 text-amber-300 border-amber-700"
                                : "bg-emerald-950 text-emerald-300 border-emerald-700"
                            }`}
                          >
                            {area.isGoldenHourBreached
                              ? "CRITICAL (>30m)"
                              : area.statusColor === "#f59e0b"
                              ? "DELAYED (15-30m)"
                              : "NORMAL (<15m)"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#070a12] border border-[#172233] text-[10.5px]">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">
                              Baseline Time:
                            </span>
                            <span className="font-bold text-white font-mono">
                              {area.baselineTimeMin} min
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">
                              Flooded Time:
                            </span>
                            <span
                              className={`font-bold font-mono ${
                                area.extraDelayMin > 0 ? "text-rose-400" : "text-slate-200"
                              }`}
                            >
                              {area.floodedTimeMin} min{" "}
                              {area.extraDelayMin > 0 ? `(+${area.extraDelayMin}m)` : "(+0m)"}
                            </span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-[#151e2b] flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 truncate pr-1">
                              Hospital:{" "}
                              <strong className="text-slate-200">
                                {area.floodedHospital?.name || area.baselineHospital.name}
                              </strong>
                            </span>
                            <span className="text-amber-300 font-bold shrink-0 font-mono">
                              Score: {area.impactScore.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded bg-[#0b0f16] border border-[#1b2536] text-center text-slate-500 text-xs">
                    Computing accessibility across zone centroids...
                  </div>
                )}
              </div>
            </div>

            {/* Facilities Directory */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                TERTIARY HOSPITALS IN ZONE ({hospitalCount})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {hospitals.map((h: any, idx: number) => (
                  <div
                    key={h.id || idx}
                    className="p-2.5 rounded bg-[#10141d] border border-[#1b2434] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs truncate max-w-[210px]">
                        {h.name}
                      </span>
                      {h.type === "specialty" ||
                      h.name?.toLowerCase().includes("guru nanak") ||
                      h.name?.toLowerCase().includes("eye") ? (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 uppercase font-bold shrink-0">
                          specialty, not emergency
                        </span>
                      ) : h.emergency ? (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase font-bold shrink-0">
                          24/7 Trauma
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {h.address || "Central Delhi Area"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
          )}
        </div>
      )}

      </div>
      {/* Footer System Disclaimer */}
      <div className="p-2.5 bg-[#080b10] border-t border-[#182333] shrink-0 text-[10px] text-slate-500 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-400">RoadRisk Delhi</span>
          <span className="text-amber-400">All data illustrative</span>
        </div>
        <div className="text-[9px] text-slate-400">
          Relative % outputs benchmarked vs baseline network datum.
        </div>
      </div>
    </aside>
  );
}
