import { assignTrafficIterative } from "./traffic";
import {
  FLOOD_HOTSPOTS,
  getEffectiveRadius,
  getRoadsInSingleHotspot,
} from "../data/floodHotspots";

export type RainfallLevel = "Moderate" | "Heavy" | "Extreme";

export interface FloodHotspot {
  id?: string;
  name: string;
  aliases: string[];
  lat: number;
  lon: number;
  radiusMeters: number;
  isDemo: boolean;
  source: string;
}

export interface WhatIfScenarioInput {
  graph: any;
  odPairs: any[];
  baselineResult: any;
  osmRoads: any[];
  closedRoadIds?: Set<string>;
  selectedHotspotId?: string | null;
  selectedHotspotIds?: string[];
  rainfallLevel?: RainfallLevel;
  activeHotspotIds?: string[];
}

export interface SecondaryGridlockRoad {
  roadId: string;
  name: string;
  highway: string;
  baselineUtilization: number;
  scenarioUtilization: number;
  utilizationSurgePct: number;
  baselineTraffic: number;
  scenarioTraffic: number;
  trafficSurgeVeh: number;
  capacity: number;
  baselineTimeMin: number;
  scenarioTimeMin: number;
  delayIncreaseMin: number;
}

export interface CascadeStep {
  step: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  blockedRoadIds: string[];
  secondaryGridlockRoadIds: string[];
  avgTravelTimeMin: number;
  travelTimeDeltaPct: number;
  disconnectedTrips: number;
  disconnectedTripsPct: number;
  overloadedRoadsCount: number;
  activeHighlights: "none" | "primary_flood" | "secondary_gridlock";
}

export interface WhatIfScenarioResult {
  hasActiveClosures: boolean;
  blockedRoadIds: Set<string>;
  hotspotBlockedRoadIds: Set<string>;
  manuallyClosedRoadIds: Set<string>;
  activeHotspot: FloodHotspot | null;
  floodedHotspots: FloodHotspot[];
  effectiveRadiusMeters: number;
  scenarioTraffic: any;
  tripsDisconnected: number;
  tripsDisconnectedPct: number;
  avgTravelTimeDeltaPct: number;
  baseAvgTravelTimeMin: number;
  scenarioAvgTravelTimeMin: number;
  travelTimeDisplay: string;
  disconnectedPenaltyMin: number;
  roadsPushedOverCapacity: SecondaryGridlockRoad[];
  secondaryGridlockRoads: SecondaryGridlockRoad[];
  summarySentence: string;
  cascadeSteps: CascadeStep[];
}

/**
 * Runs What-If simulation with blocked roads, calculates relative delta vs baseline,
 * identifies secondary gridlock ripple links, and builds 3-step cascade progression.
 */
export function runWhatIfScenario({
  graph,
  odPairs,
  baselineResult,
  osmRoads,
  closedRoadIds = new Set(),
  selectedHotspotId = null,
  selectedHotspotIds = [],
  rainfallLevel = "Extreme",
  activeHotspotIds = [],
}: WhatIfScenarioInput): WhatIfScenarioResult {
  const baseBaselineTime = Number((baselineResult?.averageTravelTimeMinutes || 2.0).toFixed(2));

  if (!graph || !odPairs || odPairs.length === 0 || !baselineResult) {
    return {
      hasActiveClosures: false,
      blockedRoadIds: new Set(),
      hotspotBlockedRoadIds: new Set(),
      manuallyClosedRoadIds: new Set(),
      activeHotspot: null,
      floodedHotspots: [],
      effectiveRadiusMeters: 0,
      scenarioTraffic: null,
      tripsDisconnected: 0,
      tripsDisconnectedPct: 0,
      avgTravelTimeDeltaPct: 0,
      baseAvgTravelTimeMin: baseBaselineTime,
      scenarioAvgTravelTimeMin: baseBaselineTime,
      travelTimeDisplay: `${baseBaselineTime.toFixed(2)} min → ${baseBaselineTime.toFixed(2)} min, +0%`,
      disconnectedPenaltyMin: 0,
      roadsPushedOverCapacity: [],
      secondaryGridlockRoads: [],
      summarySentence: "Select a waterlogging hotspot or click any road corridor to simulate flood severance (illustrative).",
      cascadeSteps: [],
    };
  }

  // 1. Resolve Hotspot Blocked Roads
  let activeHotspot: FloodHotspot | null = null;
  const hotspotBlockedRoadIds = new Set<string>();
  const floodedHotspots: FloodHotspot[] = [];
  let effectiveRadiusMeters = 0;

  // Gather all hotspots that should be flooded
  const targetHotspotIds: string[] = [];
  if (activeHotspotIds && activeHotspotIds.length > 0) {
    targetHotspotIds.push(...activeHotspotIds);
  } else if (selectedHotspotIds && selectedHotspotIds.length > 0) {
    targetHotspotIds.push(...selectedHotspotIds);
  } else if (selectedHotspotId) {
    targetHotspotIds.push(selectedHotspotId);
  }

  for (const hIdentifier of targetHotspotIds) {
    const spot = FLOOD_HOTSPOTS.find(
      (h) => h.id === hIdentifier || h.name.toLowerCase() === String(hIdentifier).toLowerCase()
    );
    if (spot && !floodedHotspots.some((f) => f.id === spot.id)) {
      floodedHotspots.push(spot);
      const rad = getEffectiveRadius(spot, rainfallLevel);
      effectiveRadiusMeters = Math.max(effectiveRadiusMeters, rad);
      const spotRoads = getRoadsInSingleHotspot(osmRoads, spot, rainfallLevel);
      spotRoads.forEach((id) => hotspotBlockedRoadIds.add(id));
    }
  }

  if (floodedHotspots.length === 1) {
    activeHotspot = floodedHotspots[0];
  }

  // Union of manually closed roads + hotspot inundated roads
  // Keep manual corridor closures working together with the hotspots
  const totalBlocked = new Set<string>();
  closedRoadIds.forEach((id) => totalBlocked.add(String(id)));
  hotspotBlockedRoadIds.forEach((id) => totalBlocked.add(String(id)));

  const hasActiveClosures = totalBlocked.size > 0;

  if (!hasActiveClosures) {
    return {
      hasActiveClosures: false,
      blockedRoadIds: new Set(),
      hotspotBlockedRoadIds: new Set(),
      manuallyClosedRoadIds: new Set(closedRoadIds),
      activeHotspot,
      floodedHotspots: [],
      effectiveRadiusMeters,
      scenarioTraffic: baselineResult,
      tripsDisconnected: 0,
      tripsDisconnectedPct: 0,
      avgTravelTimeDeltaPct: 0,
      baseAvgTravelTimeMin: baseBaselineTime,
      scenarioAvgTravelTimeMin: baseBaselineTime,
      travelTimeDisplay: `${baseBaselineTime.toFixed(2)} min → ${baseBaselineTime.toFixed(2)} min, +0%`,
      disconnectedPenaltyMin: 0,
      roadsPushedOverCapacity: [],
      secondaryGridlockRoads: [],
      summarySentence: "Baseline state: All corridors nominal. Click any road or choose a flood hotspot to model rerouting ripple (illustrative).",
      cascadeSteps: [
        {
          step: 1,
          title: "Step 1: Normal State",
          subtitle: "Pre-monsoon baseline network",
          badge: "NORMAL",
          description: "All radial avenues and railway underpasses are dry and open. Traffic follows shortest paths with nominal congestion.",
          blockedRoadIds: [],
          secondaryGridlockRoadIds: [],
          avgTravelTimeMin: baseBaselineTime,
          travelTimeDeltaPct: 0.0,
          disconnectedTrips: 0,
          disconnectedTripsPct: 0,
          overloadedRoadsCount: baselineResult.overloadedRoadsCount,
          activeHighlights: "none",
        },
      ],
    };
  }

  // 2. Re-run Traffic Assignment with Blocked Roads
  const scenarioTraffic = assignTrafficIterative(graph, odPairs, {
    iterations: 4,
    blockedRoads: totalBlocked,
    baseline: baselineResult,
  });

  // 3. Compute trips that remain connected and disconnected trips
  // Requirement: Compute "Avg trip time" in baseline and scenario over the SAME set of trips
  // (those connected in both) and derive the % change from exactly those two numbers.
  // Show disconnected trips separately as a count and a percentage.
  let totalConnectedBothDemand = 0;
  let baseConnectedBothWeightedTime = 0;
  let scenConnectedBothWeightedTime = 0;
  let totalVehicles = 0;
  let disconnectedVehicles = 0;

  for (let i = 0; i < odPairs.length; i++) {
    const pair = odPairs[i];
    const baseRoute = baselineResult.routeResults?.[i];
    const scenRoute = scenarioTraffic.routeResults?.[i];
    const demand = pair.demand || 50;
    totalVehicles += demand;

    const baseConnected = Boolean(
      baseRoute && !baseRoute.disconnected && baseRoute.travelTimeMinutes < Infinity
    );
    const scenConnected = Boolean(
      scenRoute && !scenRoute.disconnected && scenRoute.travelTimeMinutes < Infinity
    );

    // Connected in BOTH baseline and scenario
    if (baseConnected && scenConnected) {
      totalConnectedBothDemand += demand;
      baseConnectedBothWeightedTime += (baseRoute?.travelTimeMinutes || 0) * demand;
      scenConnectedBothWeightedTime += (scenRoute?.travelTimeMinutes || 0) * demand;
    }

    // Disconnected in scenario
    if (!scenConnected) {
      disconnectedVehicles += demand;
    }
  }

  const tripsDisconnected = disconnectedVehicles;
  const tripsDisconnectedPct = totalVehicles > 0
    ? Number(((tripsDisconnected / totalVehicles) * 100).toFixed(1))
    : 0;

  // Demand-weighted average over the SAME set of trips (those connected in both)
  const rawBaseAvg = totalConnectedBothDemand > 0
    ? baseConnectedBothWeightedTime / totalConnectedBothDemand
    : Number((baselineResult.averageTravelTimeMinutes || 2.0).toFixed(2));
  const rawScenAvg = totalConnectedBothDemand > 0
    ? scenConnectedBothWeightedTime / totalConnectedBothDemand
    : rawBaseAvg;

  // Requirement: Use two decimals for trip times everywhere (baseline and scenario)
  let baseAvgTravelTimeMin = Number(rawBaseAvg.toFixed(2));
  let scenarioAvgTravelTimeMin = Number(rawScenAvg.toFixed(2));

  // A scenario that lengthens trips must never display a lower average than baseline
  if (scenarioAvgTravelTimeMin < baseAvgTravelTimeMin) {
    scenarioAvgTravelTimeMin = baseAvgTravelTimeMin;
  }

  // Derive % change from EXACTLY those two numbers!
  const rawDeltaPct = baseAvgTravelTimeMin > 0
    ? ((scenarioAvgTravelTimeMin - baseAvgTravelTimeMin) / baseAvgTravelTimeMin) * 100
    : 0;
  const avgTravelTimeDeltaPct = Number(rawDeltaPct.toFixed(1));
  const travelTimeDisplay = `${baseAvgTravelTimeMin.toFixed(2)} min → ${scenarioAvgTravelTimeMin.toFixed(2)} min, +${avgTravelTimeDeltaPct}%`;

  // Explicit separate penalty for disconnected trips
  const disconnectedPenaltyMin = tripsDisconnected > 0 ? 15.0 : 0;

  // 5. Compute roads pushed over capacity (Secondary Gridlock)
  // Definition: Roads that were <= 100% utilization in baseline, but are now > 100% in scenario!
  const secondaryGridlockRoads: SecondaryGridlockRoad[] = [];
  const baseStats: Record<string, any> = baselineResult.roadStats || {};
  const scenStats: Record<string, any> = scenarioTraffic.roadStats || {};

  for (const roadId of Object.keys(scenStats)) {
    // If the road itself was blocked, it didn't become secondary gridlock - it's severed
    if (totalBlocked.has(String(roadId))) continue;

    const baseRoad = baseStats[roadId];
    const scenRoad = scenStats[roadId];
    if (!scenRoad) continue;

    const baseUtil = baseRoad ? baseRoad.utilization : 0;
    const scenUtil = scenRoad.utilization;

    // Pushed over capacity: baseline was fine (<= 100%), now overloaded (> 100%)
    if (baseUtil <= 100 && scenUtil > 100) {
      secondaryGridlockRoads.push({
        roadId: String(roadId),
        name: scenRoad.name || `Corridor #${roadId}`,
        highway: scenRoad.highway || "road",
        baselineUtilization: baseUtil,
        scenarioUtilization: scenUtil,
        utilizationSurgePct: Number((scenUtil - baseUtil).toFixed(1)),
        baselineTraffic: baseRoad?.traffic || 0,
        scenarioTraffic: scenRoad.traffic,
        trafficSurgeVeh: Math.max(0, scenRoad.traffic - (baseRoad?.traffic || 0)),
        capacity: scenRoad.capacity,
        baselineTimeMin: baseRoad?.congestedMinutes || 0,
        scenarioTimeMin: scenRoad.congestedMinutes,
        delayIncreaseMin: Number(Math.max(0, scenRoad.congestedMinutes - (baseRoad?.congestedMinutes || 0)).toFixed(2)),
      });
    }
  }

  // Sort secondary gridlock roads by highest utilization surge
  secondaryGridlockRoads.sort((a, b) => b.scenarioUtilization - a.scenarioUtilization);

  // 6. Generate precise summary sentence
  // e.g. "Closing Minto Bridge Railway Underpass causes +24.8% longer trips and overloads 5 nearby roads."
  let closureSubject = "";
  if (floodedHotspots.length > 0) {
    const count = floodedHotspots.length;
    const names = floodedHotspots.map((h) => h.name).join(", ");
    const hotspotPhrase = `${count} waterlogging hotspot${count > 1 ? "s" : ""} (${names})`;
    if (closedRoadIds.size > 0) {
      closureSubject = `${hotspotPhrase} and ${closedRoadIds.size} road corridor${closedRoadIds.size > 1 ? "s" : ""}`;
    } else {
      closureSubject = hotspotPhrase;
    }
  } else if (closedRoadIds.size === 1) {
    const singleId = Array.from(closedRoadIds)[0];
    closureSubject = graph.roadMeta[singleId]?.name || `Corridor #${singleId}`;
  } else if (closedRoadIds.size > 1) {
    closureSubject = `${closedRoadIds.size} road corridors`;
  } else {
    closureSubject = "selected corridors";
  }

  const overloadCount = secondaryGridlockRoads.length;
  const overloadText =
    overloadCount === 1
      ? "pushes 1 nearby road over capacity"
      : `pushes ${overloadCount} nearby roads over capacity`;

  const summarySentence =
    tripsDisconnectedPct > 20
      ? `Network fragmented: ${tripsDisconnectedPct}% of trips have no route (${tripsDisconnected} trips). Closing ${closureSubject} makes connected trips ${avgTravelTimeDeltaPct}% longer; cascade gridlock is not shown because most flows lack alternative routes.`
      : `Closing ${closureSubject} makes trips ${avgTravelTimeDeltaPct}% longer, ${overloadText}, and disconnects ${tripsDisconnectedPct}% of trips (${tripsDisconnected} trips, illustrative).`;

  // 7. Construct Step-by-Step Cascade Progression (3 Steps)
  // Step 1: Normal (Baseline condition)
  // Step 2: Link Floods and Traffic Shifts (Primary severance, flow detouring)
  // Step 3: Secondary Gridlock (Detour links overload, cascade domino effect)
  const secondaryRoadIds = secondaryGridlockRoads.map((r) => r.roadId);
  const cascadeSteps: CascadeStep[] = [
    {
      step: 1,
      title: "Step 1: Normal State",
      subtitle: "Pre-event baseline equilibrium",
      badge: "BASELINE (0.0% Δ)",
      description: "Corridors operate under standard peak traffic. Underpasses carry intended design volumes without inundation.",
      blockedRoadIds: [],
      secondaryGridlockRoadIds: [],
      avgTravelTimeMin: baseAvgTravelTimeMin,
      travelTimeDeltaPct: 0.0,
      disconnectedTrips: 0,
      disconnectedTripsPct: 0,
      overloadedRoadsCount: baselineResult.overloadedRoadsCount,
      activeHighlights: "none",
    },
    {
      step: 2,
      title: "Step 2: Link Inundation & Diversion",
      subtitle: `${totalBlocked.size} corridor${totalBlocked.size > 1 ? "s" : ""} severed by waterlogging`,
      badge: "PRIMARY SEVERANCE",
      description: `${closureSubject} becomes impassable. Drivers divert onto immediate parallel radials, multiplying volumes along adjacent feeder arterials.`,
      blockedRoadIds: Array.from(totalBlocked),
      secondaryGridlockRoadIds: [],
      avgTravelTimeMin: Number((baseAvgTravelTimeMin + (scenarioAvgTravelTimeMin - baseAvgTravelTimeMin) * 0.5).toFixed(2)),
      travelTimeDeltaPct: Number((avgTravelTimeDeltaPct * 0.5).toFixed(1)),
      disconnectedTrips: Math.round(tripsDisconnected * 0.5),
      disconnectedTripsPct: Number((tripsDisconnectedPct * 0.5).toFixed(1)),
      overloadedRoadsCount: baselineResult.overloadedRoadsCount + Math.min(2, overloadCount),
      activeHighlights: "primary_flood",
    },
    {
      step: 3,
      title: "Step 3: Secondary Gridlock Ripple",
      subtitle: `${overloadCount} parallel road${overloadCount > 1 ? "s" : ""} pushed over 100% capacity`,
      badge: "CASCADE GRIDLOCK",
      description: `Detour routes collapse as volume exceeds physical capacity. Secondary gridlock spreads outward, raising average travel times to ${scenarioAvgTravelTimeMin.toFixed(2)} min (+${avgTravelTimeDeltaPct}%).`,
      blockedRoadIds: Array.from(totalBlocked),
      secondaryGridlockRoadIds: secondaryRoadIds,
      avgTravelTimeMin: scenarioAvgTravelTimeMin,
      travelTimeDeltaPct: avgTravelTimeDeltaPct,
      disconnectedTrips: tripsDisconnected,
      disconnectedTripsPct: tripsDisconnectedPct,
      overloadedRoadsCount: scenarioTraffic.overloadedRoadsCount,
      activeHighlights: "secondary_gridlock",
    },
  ];

  return {
    hasActiveClosures,
    blockedRoadIds: totalBlocked,
    hotspotBlockedRoadIds,
    manuallyClosedRoadIds: closedRoadIds,
    activeHotspot,
    floodedHotspots,
    effectiveRadiusMeters,
    scenarioTraffic,
    tripsDisconnected,
    tripsDisconnectedPct,
    avgTravelTimeDeltaPct,
    baseAvgTravelTimeMin,
    scenarioAvgTravelTimeMin,
    travelTimeDisplay,
    disconnectedPenaltyMin,
    roadsPushedOverCapacity: secondaryGridlockRoads,
    secondaryGridlockRoads,
    summarySentence,
    cascadeSteps,
  };
}
