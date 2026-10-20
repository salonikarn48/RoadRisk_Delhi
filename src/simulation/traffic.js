import { dijkstraTime, getPathRoads } from "./dijkstra";
import { getRoadCapacity } from "../utils/roadCapacity";
import { distanceKm } from "../utils/geo";

export const BPR_CONFIG = {
  ALPHA: 0.15,
  BETA: 4.0,
  DEFAULT_ITERATIONS: 4,
  MAX_CONGESTION_FACTOR: 8.0, // Numerical stability guard
  GRAVITY_POWER: 1.5,
  GRAVITY_FRICTION_KM: 0.25,
};

/**
 * Identifies ~12 well-distributed zone centroid nodes across the Central Delhi road network.
 * Spatially distributes centroids so they represent distinct sectors
 * (e.g., CP North, CP South, Minto Bridge, ITO, Tilak Bridge, Delhi Gate, Barakhamba, Mandi House).
 */
export function getZoneCentroids(graph, targetCount = 12) {
  if (!graph?.nodes) return [];
  const allNodeIds = Object.keys(graph.nodes);
  if (allNodeIds.length <= targetCount) {
    return allNodeIds.map((id) => ({
      id,
      ...graph.nodes[id],
      name: `Centroid ${id.slice(0, 8)}`,
    }));
  }

  // Filter for structural intersection nodes (degree >= 3)
  const candidates = allNodeIds
    .map((id) => graph.nodes[id])
    .filter((n) => n && n.degree >= 3)
    .sort((a, b) => (b.degree || 0) - (a.degree || 0));

  const pool = candidates.length >= targetCount ? candidates : allNodeIds.map((id) => graph.nodes[id]);
  const selectedCentroids = [];
  const minSeparationKm = 0.35; // Minimum spatial separation between centroid hubs

  for (const candidate of pool) {
    if (selectedCentroids.length >= targetCount) break;
    // Check separation from already selected centroids
    const isFarEnough = selectedCentroids.every((c) => {
      const dist = distanceKm({ lat: c.lat, lon: c.lon }, { lat: candidate.lat, lon: candidate.lon });
      return dist >= minSeparationKm;
    });
    if (isFarEnough) {
      selectedCentroids.push(candidate);
    }
  }

  // If spatial constraint was too strict, fill remaining from pool
  let idx = 0;
  while (selectedCentroids.length < targetCount && idx < pool.length) {
    const candidate = pool[idx];
    if (!selectedCentroids.some((c) => c.id === candidate.id)) {
      selectedCentroids.push(candidate);
    }
    idx++;
  }

  // Assign descriptive landmark names based on coordinates in Central Delhi
  return selectedCentroids.map((c, i) => {
    let landmark = `Hub ${i + 1}`;
    const lat = c.lat;
    const lon = c.lon;
    const CENTRAL_DELHI_AREAS = [
      "ITO Junction / Vikas Marg",
      "Connaught Place Radial (Inner Circle)",
      "Minto Bridge / Railway Underpass Zone",
      "Delhi Gate / LNJP Medical Hub",
      "Barakhamba / Mandi House Corridor",
      "Tilak Bridge / BSZ Marg Approach",
      "Janpath / Shivaji Stadium Sector",
      "RML Hospital / Gol Dak Khana Sector",
      "Tolstoy Marg / Jantar Mantar Node",
      "New Delhi Railway / Bhavbhuti Marg",
      "Daryaganj Commercial Corridor",
      "Pragati Maidan / Bhairon Marg Loop",
    ];

    if (lat > 28.636 && lon < 77.225) landmark = "Minto Bridge / Railway Underpass Zone";
    else if (lat > 28.635 && lon >= 77.235) landmark = "Delhi Gate / LNJP Medical Hub";
    else if (lat >= 28.630 && lat <= 28.636 && lon >= 77.215 && lon <= 77.222) landmark = `Connaught Circus Block ${String.fromCharCode(65 + (i % 6))}`;
    else if (lat >= 28.625 && lat <= 28.632 && lon >= 77.235) landmark = "ITO Junction / Vikas Marg";
    else if (lat < 28.627 && lon >= 77.235) landmark = "Tilak Bridge / BSZ Marg Approach";
    else if (lon >= 77.223 && lon <= 77.232 && lat >= 28.628 && lat <= 28.634) landmark = "Barakhamba / Mandi House Corridor";
    else if (lat < 28.626 && lon < 77.218) landmark = "Janpath / Shivaji Stadium Sector";
    else if (lat < 28.628 && lon < 77.210) landmark = "RML Hospital / Gol Dak Khana Sector";
    else {
      landmark = CENTRAL_DELHI_AREAS[i % CENTRAL_DELHI_AREAS.length];
    }

    return {
      id: c.id,
      lat: c.lat,
      lon: c.lon,
      degree: c.degree || 2,
      name: landmark,
    };
  });
}

/**
 * 1. Generates synthetic origin-destination demand using a Gravity Model between ~12 zone centroids.
 * Label: "synthetic demand (illustrative)"
 * Formula: T_ij = K * (Mass_i * Mass_j) / (d_ij + 0.25)^1.5
 */
export function generateODDemand(graph, multiplier = 1.0) {
  if (!graph?.nodes) return [];
  const centroids = getZoneCentroids(graph, 12);
  if (centroids.length < 2) return [];

  const pairs = [];
  const K = 0.0028 * multiplier; // Gravity calibration constant tuned for peak hour OD demand (30 - 150 veh/hr per pair)

  for (let i = 0; i < centroids.length; i++) {
    for (let j = 0; j < centroids.length; j++) {
      if (i === j) continue; // No intra-zonal trips in this screening model
      const cA = centroids[i];
      const cB = centroids[j];
      const distKm = distanceKm({ lat: cA.lat, lon: cA.lon }, { lat: cB.lat, lon: cB.lon });
      const massA = Math.max(60, (cA.degree || 3) * 20 + 50);
      const massB = Math.max(60, (cB.degree || 3) * 20 + 50);
      // Classical spatial gravity model with exponential friction
      const friction = Math.pow(distKm + BPR_CONFIG.GRAVITY_FRICTION_KM, BPR_CONFIG.GRAVITY_POWER);
      const rawDemand = K * ((massA * massB) / friction);
      const demand = Math.max(10, Math.round(rawDemand));

      pairs.push({
        start: cA.id,
        end: cB.id,
        demand,
        distanceKm: Number(distKm.toFixed(2)),
        startName: cA.name,
        endName: cB.name,
        label: "synthetic demand (illustrative)",
      });
    }
  }

  return pairs;
}

export function createTrafficODPairs(odNodesOrGraph, multiplier = 1.0) {
  if (odNodesOrGraph && odNodesOrGraph.nodes) {
    return generateODDemand(odNodesOrGraph, multiplier);
  }
  if (Array.isArray(odNodesOrGraph)) {
    const pairs = [];
    for (let i = 0; i < odNodesOrGraph.length; i++) {
      for (let j = 0; j < odNodesOrGraph.length; j++) {
        if (i === j) continue;
        pairs.push({
          start: odNodesOrGraph[i],
          end: odNodesOrGraph[j],
          demand: Math.round(85 * multiplier),
          label: "synthetic demand (illustrative)",
        });
      }
    }
    return pairs;
  }
  return [];
}

/**
 * 2. Assigns trips to shortest-time paths using Dijkstra, with BPR congestion:
 *    travel_time = t0 * (1 + 0.15 * (flow / capacity)^4)
 * Runs iterative assignment (Method of Successive Averages) so flows spread over alternatives.
 */
export function assignTrafficIterative(
  graph,
  odPairs,
  options = {}
) {
  const {
    iterations = BPR_CONFIG.DEFAULT_ITERATIONS,
    blockedRoads = new Set(),
    baseline = null, // When provided, computes relative % change versus baseline
  } = options;

  const roadMeta = graph.roadMeta || {};
  const roadIds = Object.keys(roadMeta);

  // Initialize flows to 0 for all roads
  const currentFlows = {};
  for (const id of roadIds) {
    currentFlows[id] = 0;
  }

  const uniqueOrigins = [...new Set(odPairs.map((p) => p.start))];
  let finalRouteResults = [];

  // Iterative Method of Successive Averages (MSA)
  for (let iter = 1; iter <= iterations; iter++) {
    const msaStep = 1.0 / iter; // 1.0 on iter 1, 0.5 on iter 2, 0.33 on iter 3, 0.25 on iter 4

    // Compute BPR congestion factor for each road
    const roadCongestionFactors = {};
    for (const id of roadIds) {
      const meta = roadMeta[id];
      const capacity = Math.max(100, meta?.capacity || 800);
      const flow = currentFlows[id] || 0;
      const vcRatio = flow / capacity;
      // BPR congestion function: 1 + 0.15 * (flow / capacity)^4
      const factor = 1.0 + BPR_CONFIG.ALPHA * Math.pow(vcRatio, BPR_CONFIG.BETA);
      roadCongestionFactors[id] = Math.min(BPR_CONFIG.MAX_CONGESTION_FACTOR, factor);
    }

    // Solve time-weighted shortest paths from all origin centroids
    const searchTrees = {};
    for (const origin of uniqueOrigins) {
      searchTrees[origin] = dijkstraTime(graph, origin, roadCongestionFactors, blockedRoads);
    }

    // All-or-Nothing auxiliary flow assignment for this iteration
    const auxFlows = {};
    for (const id of roadIds) {
      auxFlows[id] = 0;
    }

    const iterRoutes = [];
    for (const pair of odPairs) {
      const { start, end, demand } = pair;
      const tree = searchTrees[start];
      const routeTime = tree?.times?.[end];

      if (routeTime === undefined || routeTime === Infinity) {
        iterRoutes.push({
          start,
          end,
          demand,
          travelTimeMinutes: Infinity,
          roads: [],
          disconnected: true,
          startName: pair.startName,
          endName: pair.endName,
        });
        continue;
      }

      const pathRoads = getPathRoads(tree.previous, start, end);
      for (const roadId of pathRoads) {
        auxFlows[String(roadId)] = (auxFlows[String(roadId)] || 0) + demand;
      }

      iterRoutes.push({
        start,
        end,
        demand,
        travelTimeMinutes: Number(routeTime.toFixed(2)),
        roads: pathRoads,
        disconnected: false,
        startName: pair.startName,
        endName: pair.endName,
      });
    }

    // Update link flows using MSA convex combination: flow^(k) = (1 - alpha)*flow^(k-1) + alpha*aux
    for (const id of roadIds) {
      currentFlows[id] = (1.0 - msaStep) * (currentFlows[id] || 0) + msaStep * (auxFlows[id] || 0);
    }

    finalRouteResults = iterRoutes;
  }

  // -------------------------------------------------------------
  // Final link performance analysis with BPR congested times
  // -------------------------------------------------------------
  const roadStats = {};
  let totalVehicles = 0;
  let connectedVehicles = 0;
  let disconnectedVehicles = 0;
  let totalWeightedTravelTimeMinutes = 0;

  for (const pair of finalRouteResults) {
    totalVehicles += pair.demand;
    if (pair.disconnected) {
      disconnectedVehicles += pair.demand;
    } else {
      connectedVehicles += pair.demand;
      totalWeightedTravelTimeMinutes += pair.travelTimeMinutes * pair.demand;
    }
  }

  const averageTravelTimeMinutes = connectedVehicles > 0
    ? Number((totalWeightedTravelTimeMinutes / connectedVehicles).toFixed(2))
    : 0;

  let overloadedCount = 0;
  let moderateCount = 0;
  let normalCount = 0;

  for (const id of roadIds) {
    const meta = roadMeta[id];
    const traffic = Math.round(currentFlows[id] || 0);
    const capacity = Math.max(100, meta.capacity || 800);
    const utilization = Number(((traffic / capacity) * 100).toFixed(1));

    // BPR congested link travel time
    const vcRatio = traffic / capacity;
    const congestionFactor = 1.0 + BPR_CONFIG.ALPHA * Math.pow(vcRatio, BPR_CONFIG.BETA);

    // Free flow travel time from segment lengths
    const edges = graph.roadEdges?.[id] || [];
    const totalDistKm = edges.reduce((acc, e) => acc + (e.distance || 0), 0);
    const speedKmH = meta.speedKmH || 30;
    const freeFlowMinutes = Number(((totalDistKm / speedKmH) * 60).toFixed(2));
    const congestedMinutes = Number((freeFlowMinutes * congestionFactor).toFixed(2));

    const congestion = getCongestionLevel(utilization);
    if (congestion === "overloaded") overloadedCount++;
    else if (congestion === "moderate") moderateCount++;
    else normalCount++;

    roadStats[id] = {
      roadId: id,
      name: meta.name || "Unnamed Road",
      highway: meta.highway || "road",
      traffic,
      capacity,
      utilization,
      congestion,
      congestionFactor: Number(congestionFactor.toFixed(2)),
      freeFlowMinutes,
      congestedMinutes,
      delayMinutes: Number(Math.max(0, congestedMinutes - freeFlowMinutes).toFixed(2)),
      color: getUtilizationColor(utilization),
      isBlocked: blockedRoads.has(String(id)),
    };
  }

  const totalRoads = roadIds.length;
  const percentOverCapacity = totalRoads > 0
    ? Number(((overloadedCount / totalRoads) * 100).toFixed(1))
    : 0;
  const percentModerate = totalRoads > 0
    ? Number(((moderateCount / totalRoads) * 100).toFixed(1))
    : 0;
  const percentNormal = totalRoads > 0
    ? Number(((normalCount / totalRoads) * 100).toFixed(1))
    : 0;

  // -------------------------------------------------------------
  // Relative % change versus baseline
  // -------------------------------------------------------------
  let relativeChange = null;
  if (baseline) {
    const baseAvgTime = baseline.averageTravelTimeMinutes || 1;
    const baseOverloadedPct = baseline.percentOverCapacity || 0;
    const baseDisconnected = baseline.disconnectedVehicles || 0;

    const deltaTravelTimePct = Number(
      (((averageTravelTimeMinutes - baseAvgTime) / baseAvgTime) * 100).toFixed(1)
    );
    const deltaOverloadedRoadsPct = Number(
      (percentOverCapacity - baseOverloadedPct).toFixed(1)
    );
    const deltaDisconnectedVehicles = disconnectedVehicles - baseDisconnected;

    relativeChange = {
      isBaseline: false,
      deltaTravelTimePct,
      deltaOverloadedRoadsPct,
      deltaDisconnectedVehicles,
      summaryText: `${deltaTravelTimePct >= 0 ? "+" : ""}${deltaTravelTimePct}% avg travel time vs baseline datum`,
    };
  } else {
    // This is the baseline run itself (Datum: 0.0% change)
    relativeChange = {
      isBaseline: true,
      deltaTravelTimePct: 0.0,
      deltaOverloadedRoadsPct: 0.0,
      deltaDisconnectedVehicles: 0,
      summaryText: "Baseline reference datum (0.0% change)",
    };
  }

  return {
    roadTraffic: currentFlows,
    roadStats,
    totalVehicles,
    connectedVehicles,
    disconnectedVehicles,
    averageTravelTimeMinutes,
    percentOverCapacity,
    percentModerate,
    percentNormal,
    overloadedRoadsCount: overloadedCount,
    moderateRoadsCount: moderateCount,
    normalRoadsCount: normalCount,
    totalRoadsCount: totalRoads,
    routeResults: finalRouteResults,
    iterationsRun: iterations,
    relativeChange,
    demandLabel: "synthetic demand (illustrative)",
    modelDescription: "Iterative Dijkstra + BPR Congestion (Method of Successive Averages)",
  };
}

/**
 * Backward compatibility wrapper for existing failure & flood modules
 */
export function calculateTraffic(graph, odPairs, blockedRoads = new Set(), baselineResult = null) {
  return assignTrafficIterative(graph, odPairs, {
    blockedRoads,
    iterations: BPR_CONFIG.DEFAULT_ITERATIONS,
    baseline: baselineResult,
  });
}

/**
 * 3. Color roads by utilization:
 *    Green (< 70%): Normal / Free-flow
 *    Amber (70% - 100%): Moderate / Approaching capacity
 *    Red (> 100%): Over capacity / Bottleneck
 */
export function getCongestionLevel(utilization) {
  if (utilization < 70) return "normal";
  if (utilization <= 100) return "moderate";
  return "overloaded";
}

export function getUtilizationColor(utilization) {
  if (utilization < 70) return "#10b981"; // Green (emerald-500)
  if (utilization <= 100) return "#f59e0b"; // Amber (amber-500)
  return "#ef4444"; // Red (rose-500)
}

export function getTrafficColor(utilization) {
  return getUtilizationColor(utilization);
}

export function getMostLoadedRoads(roadStats, limit = 5) {
  if (!roadStats) return [];
  return Object.values(roadStats)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, limit);
}
