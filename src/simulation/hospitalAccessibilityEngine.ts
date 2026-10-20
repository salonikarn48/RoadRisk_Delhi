import { getZoneCentroids } from "./traffic";
import { snapHospitalsToGraph } from "./hospitalAccess";
import { dijkstraTime, getPathRoads } from "./dijkstra";
import { distanceKm } from "../utils/geo";

export interface DemandNodeAccess {
  id: string;
  name: string;
  lat: number;
  lon: number;
  population: number; // synthetic population weight
  baselineTimeMin: number;
  baselineHospital: { id: string; name: string; lat: number; lon: number };
  baselinePathRoads: string[];
  baselineRouteCoords: [number, number][];
  floodedTimeMin: number;
  floodedHospital: { id: string; name: string; lat: number; lon: number } | null;
  floodedPathRoads: string[];
  floodedRouteCoords: [number, number][];
  extraDelayMin: number;
  impactScore: number; // population * extraDelay
  isGoldenHourBreached: boolean; // true if floodedTimeMin > 30 or unreachable
  isUnreachable: boolean;
  statusColor: "#10b981" | "#f59e0b" | "#ef4444"; // green <= 15, amber 15-30, red > 30
}

export interface HospitalAccessAnalysisResult {
  areas: DemandNodeAccess[];
  goldenHourBreachedAreas: DemandNodeAccess[];
  cutOffAreas: DemandNodeAccess[]; // Separated: areas with no route to any emergency trauma hospital
  delayedAreas: DemandNodeAccess[]; // Separated: areas taking over 30 min to reach trauma hospital
  hasGoldenHourBreach: boolean;
  mostAffectedAreas: DemandNodeAccess[]; // sorted by impactScore descending
  totalSyntheticPopulation: number;
  avgBaselineTimeMin: number;
  avgFloodedTimeMin: number;
  avgExtraDelayMin: number;
  totalImpactScore: number;
  disclaimer: string;
}

// Synthetic population weights tuned for Central Delhi sectors (illustrative)
const SECTOR_POPULATION_WEIGHTS: Record<string, number> = {
  "Minto Bridge / Railway North": 48000,
  "Delhi Gate / LNJP Hub": 58000,
  "ITO Junction / Vikas Marg": 64000,
  "Tilak Bridge Underpass Approach": 42000,
  "Barakhamba / Mandi House Corridor": 51000,
  "Janpath / Shivaji Stadium": 39000,
  "RML Hospital / Gol Dak Khana": 36000,
};

function getSyntheticPopulation(name: string, index: number, degree: number = 3): number {
  if (SECTOR_POPULATION_WEIGHTS[name]) {
    return SECTOR_POPULATION_WEIGHTS[name];
  }
  // Deterministic realistic synthetic population between 28,000 and 52,000
  const base = 30000 + ((index * 7919) % 22000);
  return base + degree * 1500;
}

/**
 * Extracts continuous polyline coordinates from a sequence of road IDs.
 */
function buildRouteCoords(
  pathRoads: string[],
  startCoord: [number, number],
  destCoord: [number, number],
  roadsMap: Map<string, any>
): [number, number][] {
  const coords: [number, number][] = [];
  coords.push(startCoord);

  for (const rId of pathRoads) {
    const road = roadsMap.get(String(rId));
    if (!road?.geometry || road.geometry.length === 0) continue;
    for (const pt of road.geometry) {
      const lat = Number(pt.lat);
      const lon = Number(pt.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        // Prevent immediate consecutive duplicate points
        const last = coords[coords.length - 1];
        if (!last || Math.abs(last[0] - lat) > 0.00001 || Math.abs(last[1] - lon) > 0.00001) {
          coords.push([lat, lon]);
        }
      }
    }
  }

  // Ensure destination coordinate is connected
  const last = coords[coords.length - 1];
  if (!last || Math.abs(last[0] - destCoord[0]) > 0.00001 || Math.abs(last[1] - destCoord[1]) > 0.00001) {
    coords.push(destCoord);
  }

  return coords;
}

/**
 * Computes hospital accessibility for all demand nodes in both baseline and current flood scenario.
 */
export function analyzeHospitalAccess({
  graph,
  hospitals = [],
  roads = [],
  blockedRoads = new Set(),
  scenarioTraffic = null,
}: {
  graph: any;
  hospitals: any[];
  roads: any[];
  blockedRoads?: Set<string>;
  scenarioTraffic?: any;
}): HospitalAccessAnalysisResult {
  const disclaimer = "synthetic population & travel times (illustrative)";

  if (!graph?.nodes || hospitals.length === 0) {
    return {
      areas: [],
      goldenHourBreachedAreas: [],
      cutOffAreas: [],
      delayedAreas: [],
      hasGoldenHourBreach: false,
      mostAffectedAreas: [],
      totalSyntheticPopulation: 0,
      avgBaselineTimeMin: 0,
      avgFloodedTimeMin: 0,
      avgExtraDelayMin: 0,
      totalImpactScore: 0,
      disclaimer,
    };
  }

  const snappedHospitals = snapHospitalsToGraph(hospitals, graph);
  if (snappedHospitals.length === 0) {
    return {
      areas: [],
      goldenHourBreachedAreas: [],
      cutOffAreas: [],
      delayedAreas: [],
      hasGoldenHourBreach: false,
      mostAffectedAreas: [],
      totalSyntheticPopulation: 0,
      avgBaselineTimeMin: 0,
      avgFloodedTimeMin: 0,
      avgExtraDelayMin: 0,
      totalImpactScore: 0,
      disclaimer,
    };
  }

  // Only trauma hospitals are valid Golden Hour emergency destinations
  // Specialty hospitals (e.g., Guru Nanak Eye Centre) are excluded from emergency transit destinations
  const traumaDestinations = snappedHospitals.filter(
    (h) => h.type === "trauma" || (h.type !== "specialty" && !h.name?.toLowerCase().includes("eye"))
  );
  const destinationHospitals = traumaDestinations.length > 0 ? traumaDestinations : snappedHospitals;

  const centroids = getZoneCentroids(graph, 12);
  const roadsMap = new Map<string, any>(roads.map((r) => [String(r.id), r]));

  // Congestion factors
  const scenCongestionFactors: Record<string, number> = {};
  if (scenarioTraffic?.roadStats) {
    for (const [id, stat] of Object.entries<any>(scenarioTraffic.roadStats)) {
      scenCongestionFactors[id] = stat.congestionFactor || 1.0;
    }
  }

  const areas: DemandNodeAccess[] = [];
  let totalPop = 0;
  let sumBaseTime = 0;
  let sumFloodTime = 0;
  let sumDelay = 0;
  let totalImpactScore = 0;

  for (let idx = 0; idx < centroids.length; idx++) {
    const c = centroids[idx];
    const population = getSyntheticPopulation(c.name, idx, c.degree);
    totalPop += population;

    const startNode = c.id;
    const startCoord: [number, number] = [c.lat, c.lon];

    // 1. Baseline Route to Nearest Trauma Hospital (no blocked roads)
    const baseTree: any = (dijkstraTime as any)(graph, startNode, null, new Set());
    let bestBaseHospital = destinationHospitals[0];
    let minBaseTime = Infinity;

    for (const h of destinationHospitals) {
      const t = (baseTree.times as Record<string, number>)?.[h.snappedNodeId];
      if (t !== undefined && t < minBaseTime) {
        minBaseTime = t;
        bestBaseHospital = h;
      }
    }

    if (!Number.isFinite(minBaseTime)) {
      // Direct distance fallback if graph is partitioned
      const dKm = distanceKm({ lat: c.lat, lon: c.lon }, { lat: bestBaseHospital.lat, lon: bestBaseHospital.lon });
      minBaseTime = (dKm / 35) * 60;
    }

    const baselinePathRoads = getPathRoads(baseTree.previous, startNode, bestBaseHospital.snappedNodeId);
    const baseDestCoord: [number, number] = [bestBaseHospital.lat, bestBaseHospital.lon];
    const baselineRouteCoords = buildRouteCoords(baselinePathRoads, startCoord, baseDestCoord, roadsMap);

    // 2. Flooded Scenario Route to Nearest Trauma Hospital (with blocked roads + scenario congestion)
    const floodTree: any = (dijkstraTime as any)(graph, startNode, scenCongestionFactors, blockedRoads);
    let bestFloodHospital: any = null;
    let minFloodTime = Infinity;

    for (const h of destinationHospitals) {
      const t = (floodTree.times as Record<string, number>)?.[h.snappedNodeId];
      if (t !== undefined && t < minFloodTime) {
        minFloodTime = t;
        bestFloodHospital = h;
      }
    }

    const isUnreachable = !Number.isFinite(minFloodTime) || minFloodTime === Infinity;
    const effectiveFloodTime = isUnreachable
      ? 55.0 // Severed / gridlocked access delay penalty
      : Number(minFloodTime.toFixed(2));

    const floodedPathRoads = !isUnreachable && bestFloodHospital
      ? getPathRoads(floodTree.previous, startNode, bestFloodHospital.snappedNodeId)
      : [];
    const floodDestCoord: [number, number] = bestFloodHospital
      ? [bestFloodHospital.lat, bestFloodHospital.lon]
      : baseDestCoord;
    const floodedRouteCoords = !isUnreachable
      ? buildRouteCoords(floodedPathRoads, startCoord, floodDestCoord, roadsMap)
      : [];

    const baselineTimeMin = Number(minBaseTime.toFixed(2));
    const extraDelayMin = Number(Math.max(0, effectiveFloodTime - baselineTimeMin).toFixed(2));

    // Metric: population weight (synthetic, labeled illustrative) * extra delay
    const impactScore = Math.round(population * extraDelayMin);
    totalImpactScore += impactScore;

    // Golden Hour rule: if nearest-hospital time goes above 30 minutes, Golden Hour is breached
    const isGoldenHourBreached = effectiveFloodTime > 30.0 || isUnreachable;

    // Status color: green <= 15 min, amber 15 - 30 min, red > 30 min
    let statusColor: "#10b981" | "#f59e0b" | "#ef4444" = "#10b981";
    if (isGoldenHourBreached) {
      statusColor = "#ef4444";
    } else if (effectiveFloodTime > 15.0) {
      statusColor = "#f59e0b";
    }

    sumBaseTime += baselineTimeMin;
    sumFloodTime += effectiveFloodTime;
    sumDelay += extraDelayMin;

    areas.push({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      population,
      baselineTimeMin,
      baselineHospital: {
        id: bestBaseHospital.id,
        name: bestBaseHospital.name,
        lat: bestBaseHospital.lat,
        lon: bestBaseHospital.lon,
      },
      baselinePathRoads,
      baselineRouteCoords,
      floodedTimeMin: effectiveFloodTime,
      floodedHospital: bestFloodHospital
        ? {
            id: bestFloodHospital.id,
            name: bestFloodHospital.name,
            lat: bestFloodHospital.lat,
            lon: bestFloodHospital.lon,
          }
        : null,
      floodedPathRoads,
      floodedRouteCoords,
      extraDelayMin,
      impactScore,
      isGoldenHourBreached,
      isUnreachable,
      statusColor,
    });
  }

  // Golden hour breached areas
  const goldenHourBreachedAreas = areas.filter((a) => a.isGoldenHourBreached);
  const cutOffAreas = areas.filter((a) => a.isUnreachable);
  const delayedAreas = areas.filter((a) => a.isGoldenHourBreached && !a.isUnreachable);
  const hasGoldenHourBreach = goldenHourBreachedAreas.length > 0;

  // Most affected areas sorted by (population * extra delay) descending
  const mostAffectedAreas = [...areas].sort((a, b) => b.impactScore - a.impactScore);

  const count = areas.length || 1;
  const avgBaselineTimeMin = Number((sumBaseTime / count).toFixed(2));
  const avgFloodedTimeMin = Number((sumFloodTime / count).toFixed(2));
  const avgExtraDelayMin = Number((sumDelay / count).toFixed(2));

  return {
    areas,
    goldenHourBreachedAreas,
    cutOffAreas,
    delayedAreas,
    hasGoldenHourBreach,
    mostAffectedAreas,
    totalSyntheticPopulation: totalPop,
    avgBaselineTimeMin,
    avgFloodedTimeMin,
    avgExtraDelayMin,
    totalImpactScore,
    disclaimer,
  };
}
