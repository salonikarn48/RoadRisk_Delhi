import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { buildRoadGraph } from "../simulation/graph";
import { generateODDemand, assignTrafficIterative } from "../simulation/traffic";
import { runWhatIfScenario, RainfallLevel, WhatIfScenarioResult } from "../simulation/whatIfEngine";
import { analyzeHospitalAccess, HospitalAccessAnalysisResult } from "../simulation/hospitalAccessibilityEngine";
import { calculateAreaKm2 } from "../utils/geo";
import { FLOOD_HOTSPOTS } from "../data/floodHotspots";
import {
  classifyRecency,
  classifyEventType,
  getNewestRecency,
  type RecencyLabel,
  type EventType,
} from "../utils/liveFeedClassifier";

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

export const DEFAULT_CENTRAL_DELHI_ZONE: ActiveZone = {
  name: "Central Delhi (Connaught Place, Minto Bridge, ITO)",
  south: 28.6150,
  west: 77.2050,
  north: 28.6480,
  east: 77.2500,
  center: [28.6315, 77.2270],
  isDefault: true,
  areaKm2: 14.6,
};

export interface TinyFishSource {
  title: string;
  url: string;
  site_name?: string;
  date?: string;
  position?: number;
  recencyLabel?: RecencyLabel;
}

export interface TinyFishMatch {
  hotspotName: string;
  sources: TinyFishSource[];
  snippet: string;
  eventType?: EventType;
  recencyLabel?: RecencyLabel;
  inZone?: boolean;
}

export interface TinyFishRoadMatch {
  roadName: string;
  sources: TinyFishSource[];
  snippet: string;
  eventType?: EventType;
  recencyLabel?: RecencyLabel;
}

export interface TinyFishDiagnostics {
  endpoint: string;
  queries: string[];
  total_results: number;
  results_count: number;
  latency_ms?: number;
  status: "live_success" | "cached_fallback" | "no_api_key" | "api_error";
  fields_parsed: string[];
  results_sample?: Array<{
    position?: number;
    site_name?: string;
    snippet?: string;
    title?: string;
    url?: string;
    date?: string;
  }>;
}

export interface TinyFishLiveFeedData {
  mode: "live" | "cached";
  areaName?: string;
  fetchedAt: string;
  matches: TinyFishMatch[];
  matchedRoads?: TinyFishRoadMatch[];
  reason?: string;
  error?: string;
  diagnostics?: TinyFishDiagnostics;
}

export interface AppStateContextType {
  currentZone: ActiveZone;
  setCurrentZone: React.Dispatch<React.SetStateAction<ActiveZone>>;
  roads: any[];
  hospitals: any[];
  dataSource: "OSM live" | "fallback snapshot";
  loading: boolean;
  loadingMessage: string;
  fetchError: string | null;
  selectedRoad: any | null;
  setSelectedRoad: (road: any | null) => void;
  closedRoadIds: Set<string>;
  selectedHotspotId: string | null;
  setSelectedHotspotId: (id: string | null) => void;
  selectedHotspotIds: string[];
  setSelectedHotspotIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleHotspot: (hotspotId: string) => void;
  selectAllHotspots: () => void;
  clearHotspots: () => void;
  applyMonsoonPreset: () => void;
  applySeverePreset: () => void;
  rainfallLevel: RainfallLevel;
  setRainfallLevel: (level: RainfallLevel) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cascadeStepIndex: number;
  setCascadeStepIndex: (step: number) => void;
  selectedHospitalAreaId: string | null;
  setSelectedHospitalAreaId: (id: string | null) => void;
  showHospitalNodes: boolean;
  setShowHospitalNodes: React.Dispatch<React.SetStateAction<boolean>>;
  liveFeed: TinyFishLiveFeedData | null;
  isLiveFeedLoading: boolean;
  useLiveTinyFish: boolean;
  setUseLiveTinyFish: (use: boolean) => void;
  isReplayMode: boolean;
  setIsReplayMode: React.Dispatch<React.SetStateAction<boolean>>;
  qualifyingMatches: TinyFishMatch[];
  qualifyingCount: number;
  liveMatchedHotspotIds: string[];
  liveMatchedRoadIds: Set<string>;
  effectiveClosedRoadIds: Set<string>;
  graph: any;
  odPairs: any[];
  baselineTraffic: any;
  whatIfScenario: WhatIfScenarioResult | null;
  hospitalAccess: HospitalAccessAnalysisResult | null;
  activeZoneHotspots: any[];
  loadZoneData: (targetZone?: ActiveZone, bypassCache?: boolean) => Promise<boolean>;
  handleRunAnalysisArea: (bounds: [[number, number], [number, number]], name?: string) => Promise<boolean>;
  handleResetToCentralDelhi: () => void;
  fetchLiveFeed: (bypassCache?: boolean, zoneOverride?: ActiveZone, roadsOverride?: any[]) => Promise<void>;
  toggleRoadClosed: (roadId: string) => void;
  resetClosures: () => void;
  handleRunDemoScenario: () => void;
  fitTrigger: number;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentZone, setCurrentZone] = useState<ActiveZone>(DEFAULT_CENTRAL_DELHI_ZONE);
  const [roads, setRoads] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<"OSM live" | "fallback snapshot">("fallback snapshot");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing Central Delhi network...");
  const [selectedRoad, setSelectedRoad] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // What-If & Cascade State
  const [closedRoadIds, setClosedRoadIds] = useState<Set<string>>(new Set());
  const [selectedHotspotIds, setSelectedHotspotIds] = useState<string[]>([]);
  const [rainfallLevel, setRainfallLevel] = useState<RainfallLevel>("Extreme");
  const [activeTab, setActiveTab] = useState<string>("what_if");
  const [cascadeStepIndex, setCascadeStepIndex] = useState<number>(2);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  // Backward-compatible single hotspot id accessor
  const selectedHotspotId = selectedHotspotIds[0] || null;
  const setSelectedHotspotId = useCallback((id: string | null) => {
    setSelectedHotspotIds(id ? [id] : []);
  }, []);

  // Hospital Access State
  const [selectedHospitalAreaId, setSelectedHospitalAreaId] = useState<string | null>(null);
  const [showHospitalNodes, setShowHospitalNodes] = useState<boolean>(true);

  // Live Feed & TinyFish State
  const [liveFeed, setLiveFeed] = useState<TinyFishLiveFeedData | null>(null);
  const [isLiveFeedLoading, setIsLiveFeedLoading] = useState<boolean>(false);
  const [useLiveTinyFish, setUseLiveTinyFish] = useState<boolean>(false);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);

  // Run demo scenario: uses "Monsoon storm (3 hotspots)" preset (Minto Bridge, ITO / Vikas Marg, Tilak Bridge) at Extreme rainfall, opens Cascade tab
  const handleRunDemoScenario = useCallback(() => {
    setClosedRoadIds(new Set());
    setSelectedHotspotIds(["minto-bridge", "ito-vikas-marg", "tilak-bridge"]);
    setRainfallLevel("Extreme");
    setUseLiveTinyFish(false);
    setActiveTab("cascade");
    setCascadeStepIndex(2); // Domino secondary gridlock
    setSelectedRoad(null);
    setSelectedHospitalAreaId(null);
  }, []);

  // Fetch roads and hospitals from backend Express proxy
  const loadZoneData = useCallback(async (targetZone: ActiveZone = currentZone, bypassCache = false) => {
    setLoading(true);
    setFetchError(null);
    setLoadingMessage(`Querying OpenStreetMap for drivable roads in ${targetZone.name}...`);

    try {
      const bboxParams = `south=${targetZone.south}&west=${targetZone.west}&north=${targetZone.north}&east=${targetZone.east}`;
      const bypassParam = bypassCache ? "&bypassCache=true" : "";

      // 1. Fetch Roads
      const roadsPromise = fetch(`/api/roads?${bboxParams}${bypassParam}`).then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `Roads endpoint failed HTTP ${res.status}`);
        }
        return json;
      });

      // 2. Fetch Hospitals
      const hospitalsPromise = fetch(`/api/hospitals?${bboxParams}${bypassParam}`).then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `Hospitals endpoint failed HTTP ${res.status}`);
        }
        return json;
      });

      const [roadsData, hospitalsData] = await Promise.all([roadsPromise, hospitalsPromise]);

      const loadedRoads = roadsData?.roads || [];
      const loadedHospitals = hospitalsData?.hospitals || [];
      const source = roadsData?.source === "OSM live" ? "OSM live" : "fallback snapshot";

      // console.log the bbox, the number of roads returned and the number of hospitals returned when the analysis runs.
      console.log(
        "Analysis run for bbox:",
        {
          south: targetZone.south,
          west: targetZone.west,
          north: targetZone.north,
          east: targetZone.east,
        },
        `Roads returned: ${loadedRoads.length}, Hospitals returned: ${loadedHospitals.length}`
      );

      if (loadedRoads.length === 0) {
        setFetchError("No roads found in this area. Try a different or slightly larger area");
      }

      setRoads(loadedRoads);
      setHospitals(loadedHospitals);
      setDataSource(source);
      setCurrentZone(targetZone);
      return loadedRoads.length > 0;
    } catch (err: any) {
      console.warn("Zone data fetch error:", err?.message || err);
      setFetchError(err.message || "Failed to load network for this area.");
      return false;
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }, [currentZone]);

  const handleRunAnalysisArea = useCallback(async (bounds: [[number, number], [number, number]], name?: string): Promise<boolean> => {
    const south = Math.min(bounds[0][0], bounds[1][0]);
    const north = Math.max(bounds[0][0], bounds[1][0]);
    const west = Math.min(bounds[0][1], bounds[1][1]);
    const east = Math.max(bounds[0][1], bounds[1][1]);
    const center: [number, number] = [(south + north) / 2, (west + east) / 2];
    const areaKm2 = calculateAreaKm2(bounds);

    const initialName = name || `Custom Area (${areaKm2} km²)`;
    const newZone: ActiveZone = {
      name: initialName,
      south,
      west,
      north,
      east,
      center,
      isDefault: false,
      areaKm2,
    };

    console.log(
      "Running analysis for bbox:",
      { south, west, north, east },
      `Name: ${initialName}`
    );

    setClosedRoadIds(new Set());
    setSelectedHotspotId(null);
    setSelectedRoad(null);
    setSelectedHospitalAreaId(null);
    setCurrentZone(newZone);

    await loadZoneData(newZone, false);

    // Reverse-geocode in the background if no explicit name was provided
    if (!name) {
      fetch(`/api/reverse-geocode?lat=${center[0]}&lon=${center[1]}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.name) {
            setCurrentZone((prev) =>
              prev.south === south && prev.west === west ? { ...prev, name: data.name } : prev
            );
          }
        })
        .catch(() => {});
    }
    return true;
  }, [loadZoneData]);

  const handleResetToCentralDelhi = useCallback(() => {
    setClosedRoadIds(new Set());
    setSelectedHotspotIds([]);
    setSelectedRoad(null);
    setSelectedHospitalAreaId(null);
    loadZoneData(DEFAULT_CENTRAL_DELHI_ZONE, false);
    setFitTrigger((c) => c + 1);
  }, [loadZoneData]);

  // Active hotspots in currently analyzed zone
  const activeZoneHotspots = useMemo(() => {
    if (currentZone.isDefault) {
      return FLOOD_HOTSPOTS;
    }
    return FLOOD_HOTSPOTS.filter(
      (h) =>
        h.lat >= currentZone.south &&
        h.lat <= currentZone.north &&
        h.lon >= currentZone.west &&
        h.lon <= currentZone.east
    );
  }, [currentZone]);

  useEffect(() => {
    loadZoneData(DEFAULT_CENTRAL_DELHI_ZONE);
  }, []);

  // Fetch TinyFish Live Flood Feed for current selected area
  const fetchLiveFeed = useCallback(
    async (bypassCache = false, zoneOverride?: ActiveZone, roadsOverride?: any[]) => {
      const targetZone = zoneOverride || currentZone;
      const targetRoads = roadsOverride || roads;
      const targetHotspots = FLOOD_HOTSPOTS.filter(
        (h) =>
          h.lat >= targetZone.south &&
          h.lat <= targetZone.north &&
          h.lon >= targetZone.west &&
          h.lon <= targetZone.east
      );

      setIsLiveFeedLoading(true);
      try {
        const payload = {
          areaName: targetZone.name,
          lat: targetZone.center[0],
          lon: targetZone.center[1],
          south: targetZone.south,
          west: targetZone.west,
          north: targetZone.north,
          east: targetZone.east,
          isDefault: targetZone.isDefault,
          hotspots: targetHotspots.map((h) => ({ name: h.name, aliases: h.aliases || [] })),
          roads: Array.from(
            new Set(
              targetRoads
                .map((r: any) => r.name)
                .filter((n): n is string => Boolean(n) && typeof n === "string" && n.length > 3)
            )
          ),
          bypassCache,
        };

        const res = await fetch("/api/live-flood-feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`Live feed HTTP ${res.status}`);
        const data = await res.json();
        setLiveFeed(data);
      } catch (err: any) {
        console.info("Info: Live flood feed fetch:", err?.message || err);
      } finally {
        setIsLiveFeedLoading(false);
      }
    },
    [currentZone, roads]
  );

  // Automatically fetch live feed when zone or roads change
  useEffect(() => {
    fetchLiveFeed(false, currentZone, roads);
  }, [currentZone.name, currentZone.south, currentZone.west, roads.length]);

  // Helper to test if a matched hotspot belongs to the current zone's hotspot list
  const isMatchInZone = useCallback(
    (m: TinyFishMatch) => {
      if (m.inZone !== undefined) return m.inZone;
      const lower = m.hotspotName.toLowerCase().trim();
      return activeZoneHotspots.some(
        (h) =>
          h.name.toLowerCase().trim() === lower ||
          (h.aliases && h.aliases.some((a: string) => a.toLowerCase().trim() === lower))
      );
    },
    [activeZoneHotspots]
  );

  // Requirement 2, 3, 5: Hotspots qualifying to drive simulation:
  // - Must belong to current zone's hotspot list
  // - Must be classified as "Active incident"
  // - Must have "Recent (last 7 days)" or "This season (7 to 120 days)" recency label (or Historical when Replay mode is ON)
  const qualifyingMatches = useMemo(() => {
    let list = liveFeed?.matches || [];
    if (isReplayMode && !list.some((m) => isMatchInZone(m))) {
      list = [
        {
          hotspotName: "Minto Bridge Railway Underpass",
          sources: [{ title: "Delhi rains: Traffic halted at Minto Bridge underpass after waterlogging", url: "https://timesofindia.indiatimes.com/city/delhi/minto-bridge-waterlogged-traffic-diverted", date: "Jul 15, 2024", recencyLabel: "Historical (older than 120 days)" }],
          snippet: "Traffic movement closed at Minto Bridge Railway Underpass due to severe water logging. Commuters advised to avoid Swami Vivekananda Marg Cut and take alternate routes via Barakhamba Road and Deen Dayal Upadhyaya Marg.",
          eventType: "Active incident" as const,
          recencyLabel: "Historical (older than 120 days)" as const,
          inZone: true,
        },
        {
          hotspotName: "Tilak Bridge Railway Underpass",
          sources: [{ title: "Tilak Bridge underpass submerged; Delhi traffic police divert vehicles", url: "https://indianexpress.com/article/cities/delhi/tilak-bridge-submerged-traffic-diversion", date: "Aug 11, 2024", recencyLabel: "Historical (older than 120 days)" }],
          snippet: "Tilak Bridge RUB inundated under stormwater runoff; traffic personnel deploying emergency de-watering pumps while traffic has been redirected via Sikandra Road.",
          eventType: "Active incident" as const,
          recencyLabel: "Historical (older than 120 days)" as const,
          inZone: true,
        },
        {
          hotspotName: "ITO Junction / Vikas Marg Corridor",
          sources: [{ title: "Waterlogging chokes ITO crossing, heavy jam on Vikas Marg towards Laxmi Nagar", url: "https://ndtv.com/delhi-news/ito-waterlogging-traffic-jam-vikas-marg", date: "Aug 11, 2024", recencyLabel: "Historical (older than 120 days)" }],
          snippet: "Severe water accumulation at ITO Junction and Vikas Marg Inundation Cut has slowed vehicular movement to a crawl.",
          eventType: "Active incident" as const,
          recencyLabel: "Historical (older than 120 days)" as const,
          inZone: true,
        },
      ];
    }

    return list.filter((m) => {
      // 1. Zone filter: only hotspots that belong to the current zone's hotspot list
      if (!isMatchInZone(m)) return false;

      // 2. Event type: classify snippet as "Active incident" vs "Risk listing / preparedness"
      const eventType = m.eventType || classifyEventType(m.snippet, m.hotspotName);
      if (eventType !== "Active incident") return false;

      // 3. Recency filter: Recent or This season
      const recency =
        m.recencyLabel ||
        getNewestRecency(
          (m.sources || []).map((s) => s.recencyLabel || classifyRecency(s.date, m.snippet))
        );

      if (isReplayMode) {
        return true; // Historical results used in replay mode
      }
      return recency === "Recent (last 7 days)" || recency === "This season (7 to 120 days)";
    });
  }, [liveFeed, isMatchInZone, isReplayMode]);

  const qualifyingCount = qualifyingMatches.length;

  // When "Use live TinyFish conditions" is enabled:
  // 1. Matched news hotspots become flooded - ONLY qualifying in-zone active incidents!
  const liveMatchedHotspotIds = useMemo(() => {
    if (!useLiveTinyFish) return [];
    return qualifyingMatches.map((m: any) => m.hotspotName);
  }, [useLiveTinyFish, qualifyingMatches]);

  // 2. Matched road corridors from news advisories are closed
  const liveMatchedRoadIds = useMemo(() => {
    if (!useLiveTinyFish || !roads || roads.length === 0) {
      return new Set<string>();
    }
    let candidateRoads = liveFeed?.matchedRoads || [];
    if (isReplayMode && candidateRoads.length === 0) {
      candidateRoads = [
        {
          roadName: "Ring Road",
          sources: [{ title: "Delhi Traffic Police: Diversion on Ring Road due to waterlogging", url: "https://ndtv.com/delhi-news/delhi-traffic-police-advisories", date: "Jul 15, 2024", recencyLabel: "Historical (older than 120 days)" }],
          snippet: "Traffic affected on Ring Road due to water accumulation.",
          eventType: "Active incident" as const,
          recencyLabel: "Historical (older than 120 days)" as const,
        },
        {
          roadName: "Mathura Road",
          sources: [{ title: "Waterlogging slows Mathura Road", url: "https://timesofindia.indiatimes.com/city/delhi/mathura-road-slow-traffic", date: "Aug 11, 2024", recencyLabel: "Historical (older than 120 days)" }],
          snippet: "Waterlogging reported on Mathura Road near Pragati Maidan.",
          eventType: "Active incident" as const,
          recencyLabel: "Historical (older than 120 days)" as const,
        },
      ];
    }

    const qualifyingRoads = candidateRoads.filter((mr) => {
      const eventType = mr.eventType || classifyEventType(mr.snippet, mr.roadName);
      if (eventType !== "Active incident") return false;
      const recency =
        mr.recencyLabel ||
        getNewestRecency(
          (mr.sources || []).map((s) => s.recencyLabel || classifyRecency(s.date, mr.snippet))
        );
      if (isReplayMode) return true;
      return recency === "Recent (last 7 days)" || recency === "This season (7 to 120 days)";
    });

    const matchedNames = new Set(
      qualifyingRoads.map((mr: any) => mr.roadName.toLowerCase().trim())
    );
    const matchedIds = new Set<string>();
    for (const r of roads) {
      if (r.name && matchedNames.has(r.name.toLowerCase().trim())) {
        matchedIds.add(String(r.id));
      }
    }
    return matchedIds;
  }, [useLiveTinyFish, liveFeed, roads, isReplayMode]);

  // Combined closed road IDs (manual road closures + live matched road closures)
  const effectiveClosedRoadIds = useMemo(() => {
    const combined = new Set(closedRoadIds);
    if (useLiveTinyFish) {
      liveMatchedRoadIds.forEach((id) => combined.add(id));
    }
    return combined;
  }, [closedRoadIds, useLiveTinyFish, liveMatchedRoadIds]);

  // Build network graph from loaded roads (nodes at intersections, edges with length, speed, capacity)
  const graph = useMemo(() => {
    if (!roads || roads.length === 0) return null;
    return buildRoadGraph(roads);
  }, [roads]);

  // 1. Generate synthetic origin-destination demand with a Gravity Model between ~12 zone centroid nodes
  const odPairs = useMemo(() => {
    if (!graph) return [];
    return generateODDemand(graph);
  }, [graph]);

  // 2. Assign trips to shortest-time paths using Dijkstra, with BPR congestion:
  //    travel time = t0 * (1 + 0.15 * (flow / capacity)^4)
  const baselineTraffic = useMemo(() => {
    if (!graph || odPairs.length === 0) return null;
    return assignTrafficIterative(graph, odPairs, { iterations: 4 });
  }, [graph, odPairs]);

  // Toggle closure for an individual road corridor
  const toggleRoadClosed = useCallback((roadId: string) => {
    setClosedRoadIds((prev: Set<string>) => {
      const next = new Set(prev);
      const idStr = String(roadId);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  }, []);

  // Multi-hotspot controls
  const toggleHotspot = useCallback((hotspotId: string) => {
    setSelectedHotspotIds((prev) =>
      prev.includes(hotspotId)
        ? prev.filter((id) => id !== hotspotId)
        : [...prev, hotspotId]
    );
  }, []);

  const selectAllHotspots = useCallback(() => {
    setSelectedHotspotIds(activeZoneHotspots.map((h) => h.id || h.name));
  }, [activeZoneHotspots]);

  const clearHotspots = useCallback(() => {
    setSelectedHotspotIds([]);
  }, []);

  // Monsoon storm (3 hotspots): checks Minto Bridge Railway Underpass, ITO / Vikas Marg and Tilak Bridge underpass at Extreme rainfall
  const applyMonsoonPreset = useCallback(() => {
    setSelectedHotspotIds(["minto-bridge", "ito-vikas-marg", "tilak-bridge"]);
    setRainfallLevel("Extreme");
  }, []);

  // Severe storm (all hotspots): checks all hotspots in the active zone at Extreme rainfall
  const applySeverePreset = useCallback(() => {
    setSelectedHotspotIds(activeZoneHotspots.map((h) => h.id || h.name));
    setRainfallLevel("Extreme");
  }, [activeZoneHotspots]);

  // Reset all flood & road closures back to baseline
  const resetClosures = useCallback(() => {
    setClosedRoadIds(new Set());
    setSelectedHotspotIds([]);
    setUseLiveTinyFish(false);
    setIsReplayMode(false);
    setCascadeStepIndex(2);
    setSelectedHospitalAreaId(null);
    setFitTrigger((c) => c + 1);
  }, []);

  // 3. What-If & Cascade simulation engine
  const whatIfScenario = useMemo(() => {
    if (!graph || !baselineTraffic) return null;
    return runWhatIfScenario({
      graph,
      odPairs,
      baselineResult: baselineTraffic,
      osmRoads: roads,
      closedRoadIds: effectiveClosedRoadIds,
      selectedHotspotIds: useLiveTinyFish ? [] : selectedHotspotIds,
      rainfallLevel,
      activeHotspotIds: liveMatchedHotspotIds,
    });
  }, [
    graph,
    odPairs,
    baselineTraffic,
    roads,
    effectiveClosedRoadIds,
    selectedHotspotIds,
    rainfallLevel,
    useLiveTinyFish,
    liveMatchedHotspotIds,
  ]);

  // 4. Hospital Accessibility Engine
  const hospitalAccess = useMemo(() => {
    if (!graph || hospitals.length === 0) return null;
    const blockedSet = whatIfScenario?.hasActiveClosures
      ? whatIfScenario.blockedRoadIds
      : new Set<string>();

    return analyzeHospitalAccess({
      graph,
      hospitals,
      roads,
      blockedRoads: blockedSet,
      scenarioTraffic: whatIfScenario?.scenarioTraffic,
    });
  }, [graph, hospitals, roads, whatIfScenario]);

  const value = {
    currentZone,
    setCurrentZone,
    roads,
    hospitals,
    dataSource,
    loading,
    loadingMessage,
    fetchError,
    selectedRoad,
    setSelectedRoad,
    closedRoadIds,
    selectedHotspotId,
    setSelectedHotspotId,
    selectedHotspotIds,
    setSelectedHotspotIds,
    toggleHotspot,
    selectAllHotspots,
    clearHotspots,
    applyMonsoonPreset,
    applySeverePreset,
    rainfallLevel,
    setRainfallLevel,
    activeTab,
    setActiveTab,
    cascadeStepIndex,
    setCascadeStepIndex,
    selectedHospitalAreaId,
    setSelectedHospitalAreaId,
    showHospitalNodes,
    setShowHospitalNodes,
    liveFeed,
    isLiveFeedLoading,
    useLiveTinyFish,
    setUseLiveTinyFish,
    isReplayMode,
    setIsReplayMode,
    qualifyingMatches,
    qualifyingCount,
    liveMatchedHotspotIds,
    liveMatchedRoadIds,
    effectiveClosedRoadIds,
    graph,
    odPairs,
    baselineTraffic,
    whatIfScenario,
    hospitalAccess,
    activeZoneHotspots,
    loadZoneData,
    handleRunAnalysisArea,
    handleResetToCentralDelhi,
    fetchLiveFeed,
    toggleRoadClosed,
    resetClosures,
    handleRunDemoScenario,
    fitTrigger,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};
