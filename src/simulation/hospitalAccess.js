import { distanceKm } from "../utils/geo";
import { ROAD_SPEEDS_KMH, HOSPITAL_CONFIG } from "../data/constants";

// MinHeap implementation for time-weighted Dijkstra
class TimeMinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this.bubbleUp();
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const root = this.heap[0];
    const last = this.heap.pop();
    this.heap[0] = last;
    this.bubbleDown();
    return root;
  }

  get size() {
    return this.heap.length;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].time <= this.heap[index].time) break;
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  bubbleDown() {
    let index = 0;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (
        left < this.heap.length &&
        this.heap[left].time < this.heap[smallest].time
      ) {
        smallest = left;
      }
      if (
        right < this.heap.length &&
        this.heap[right].time < this.heap[smallest].time
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

// Snap each hospital to the nearest node in the graph
export function snapHospitalsToGraph(hospitals = [], graph) {
  if (!hospitals || hospitals.length === 0 || !graph?.nodes) return [];
  const nodeEntries = Object.entries(graph.nodes);
  if (nodeEntries.length === 0) return [];

  return hospitals
    .map((hospital) => {
      let closestNodeId = null;
      let minDistance = Infinity;

      for (const [nodeId, node] of nodeEntries) {
        const d = distanceKm(
          { lat: hospital.lat, lon: hospital.lon },
          { lat: node.lat, lon: node.lon }
        );
        if (d < minDistance) {
          minDistance = d;
          closestNodeId = nodeId;
        }
      }

      const connectedRoadId = graph.adjacency[closestNodeId]?.[0]?.roadId;
      const roadName = connectedRoadId
        ? graph.roadMeta[connectedRoadId]?.name || "Local Link"
        : "Corridor Link";

      return {
        ...hospital,
        snappedNodeId: closestNodeId,
        snappedDistanceMeters: Math.round(minDistance * 1000),
        snappedRoadName: roadName,
      };
    })
    .filter((h) => h.snappedNodeId !== null);
}

// Multi-source Dijkstra computing shortest travel time in minutes from any hospital
export function computeHospitalTravelTimes(
  graph,
  hospitals = [],
  originNodes = [],
  blockedRoads = new Set(),
  odPairs = [],
  thresholdMinutes = HOSPITAL_CONFIG.GOLDEN_HOUR_THRESHOLD_MINUTES
) {
  if (!graph?.nodes || hospitals.length === 0 || originNodes.length === 0) {
    return {
      nodeResults: {},
      originsEvaluated: 0,
      demandWithin8Percent: 0,
      demandWithin15Percent: 0,
      unreachableOriginsCount: 0,
      averageTravelTimeMinutes: null,
      totalDemand: 0,
      hasHospitals: hospitals.length > 0,
    };
  }

  // Calculate demand weight per origin node
  const originDemand = {};
  originNodes.forEach((nodeId) => {
    originDemand[nodeId] = 0;
  });

  let totalDemand = 0;
  odPairs.forEach((pair) => {
    if (originDemand[pair.start] !== undefined) {
      originDemand[pair.start] += pair.demand;
      totalDemand += pair.demand;
    }
  });

  // If no OD pairs matched, give equal unit weight
  if (totalDemand === 0) {
    originNodes.forEach((nodeId) => {
      originDemand[nodeId] = 100;
      totalDemand += 100;
    });
  }

  // Multi-source Dijkstra queue
  const times = {};
  const nearestHospital = {};
  const queue = new TimeMinHeap();

  Object.keys(graph.nodes).forEach((nodeId) => {
    times[nodeId] = Infinity;
    nearestHospital[nodeId] = null;
  });

  // Seed only with valid trauma hospitals (exclude specialty hospitals like Guru Nanak Eye Centre)
  const validTraumaHospitals = hospitals.filter(
    (h) => h.type === "trauma" || (h.type !== "specialty" && !h.name?.toLowerCase().includes("eye"))
  );

  validTraumaHospitals.forEach((hospital) => {
    if (!hospital.snappedNodeId || !graph.nodes[hospital.snappedNodeId]) return;
    const hNode = hospital.snappedNodeId;
    times[hNode] = 0;
    nearestHospital[hNode] = {
      id: hospital.id,
      name: hospital.name,
      address: hospital.address,
      type: hospital.type || "trauma",
    };
    queue.push({
      node: hNode,
      time: 0,
      hospital: nearestHospital[hNode],
    });
  });

  // Traverse graph
  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;
    const { node: u, time: uTime, hospital: uHospital } = current;

    if (uTime > times[u]) continue;

    const neighbors = graph.adjacency[u] || [];
    for (const edge of neighbors) {
      // Skip blocked/flooded roads
      if (blockedRoads.has(String(edge.roadId))) continue;

      const roadMeta = graph.roadMeta[String(edge.roadId)];
      const highway = roadMeta?.highway || "road";
      const speedKmH =
        ROAD_SPEEDS_KMH[highway] || ROAD_SPEEDS_KMH.default || 20;

      // Travel time in minutes for this segment = (distance in km / speed in km/h) * 60
      const segmentTimeMinutes = (edge.distance / speedKmH) * 60;
      const newTime = uTime + segmentTimeMinutes;

      if (newTime < times[edge.node]) {
        times[edge.node] = newTime;
        nearestHospital[edge.node] = uHospital;
        queue.push({
          node: edge.node,
          time: newTime,
          hospital: uHospital,
        });
      }
    }
  }

  // Compile origin node results
  const nodeResults = {};
  let demandWithinThreshold = 0;
  let demandWithin15 = 0;
  let unreachableOriginsCount = 0;
  let totalReachableWeightedTime = 0;
  let totalReachableDemand = 0;

  originNodes.forEach((nodeId) => {
    const time = times[nodeId];
    const demand = originDemand[nodeId] || 0;
    const hospital = nearestHospital[nodeId];

    let status = "within_8";
    let color = "#10b981"; // green <= 8 min

    if (!Number.isFinite(time) || time === Infinity) {
      status = "unreachable";
      color = "#f43f5e"; // red unreachable
      unreachableOriginsCount++;
    } else if (time > HOSPITAL_CONFIG.MODERATE_THRESHOLD_MINUTES) {
      status = "critical_over_15";
      color = "#f43f5e"; // red > 15 min
      totalReachableWeightedTime += time * demand;
      totalReachableDemand += demand;
    } else if (time > thresholdMinutes) {
      status = "moderate_8_15";
      color = "#f59e0b"; // amber 8-15 min
      demandWithin15 += demand;
      totalReachableWeightedTime += time * demand;
      totalReachableDemand += demand;
    } else {
      status = "within_8";
      color = "#10b981"; // green <= 8 min
      demandWithinThreshold += demand;
      demandWithin15 += demand;
      totalReachableWeightedTime += time * demand;
      totalReachableDemand += demand;
    }

    nodeResults[nodeId] = {
      nodeId,
      timeMinutes: Number.isFinite(time) ? Number(time.toFixed(1)) : Infinity,
      timeMinutesRaw: time,
      demand,
      status,
      color,
      nearestHospitalId: hospital?.id || null,
      nearestHospitalName: hospital?.name || null,
      nearestHospitalAddress: hospital?.address || null,
    };
  });

  const demandWithin8Percent =
    totalDemand > 0
      ? Number(((demandWithinThreshold / totalDemand) * 100).toFixed(1))
      : 0;
  const demandWithin15Percent =
    totalDemand > 0
      ? Number(((demandWithin15 / totalDemand) * 100).toFixed(1))
      : 0;

  const averageTravelTimeMinutes =
    totalReachableDemand > 0
      ? Number((totalReachableWeightedTime / totalReachableDemand).toFixed(1))
      : null;

  return {
    nodeResults,
    originsEvaluated: originNodes.length,
    demandWithin8Percent,
    demandWithin15Percent,
    unreachableOriginsCount,
    averageTravelTimeMinutes,
    totalDemand,
    hasHospitals: hospitals.length > 0,
    thresholdMinutes,
  };
}

// Compare Baseline vs Post-Flood Hospital Accessibility
export function compareHospitalAccess(
  baselineAccess,
  floodAccess,
  thresholdMinutes = HOSPITAL_CONFIG.GOLDEN_HOUR_THRESHOLD_MINUTES
) {
  if (!baselineAccess || !floodAccess) {
    return null;
  }

  const beforeWithin8 = baselineAccess.demandWithin8Percent;
  const afterWithin8 = floodAccess.demandWithin8Percent;
  const deltaWithin8 = Number((afterWithin8 - beforeWithin8).toFixed(1));

  const beforeWithin15 = baselineAccess.demandWithin15Percent ?? 100;
  const afterWithin15 = floodAccess.demandWithin15Percent ?? 100;
  const deltaWithin15 = Number((afterWithin15 - beforeWithin15).toFixed(1));

  const unreachableCount = floodAccess.unreachableOriginsCount;
  const newlyUnreachableCount = Math.max(
    0,
    floodAccess.unreachableOriginsCount - baselineAccess.unreachableOriginsCount
  );

  const beforeAvg = baselineAccess.averageTravelTimeMinutes;
  const afterAvg = floodAccess.averageTravelTimeMinutes;
  const avgTimeIncrease =
    beforeAvg != null && afterAvg != null
      ? Number((afterAvg - beforeAvg).toFixed(1))
      : null;

  const newlyCompromisedOrigins = [];
  Object.keys(baselineAccess.nodeResults || {}).forEach((nodeId) => {
    const beforeNode = baselineAccess.nodeResults[nodeId];
    const afterNode = floodAccess.nodeResults[nodeId];
    if (!beforeNode || !afterNode) return;

    if (
      beforeNode.timeMinutesRaw <= thresholdMinutes &&
      afterNode.timeMinutesRaw > thresholdMinutes
    ) {
      newlyCompromisedOrigins.push({
        nodeId,
        beforeTime: beforeNode.timeMinutes,
        afterTime: afterNode.timeMinutes,
        isUnreachable: afterNode.status === "unreachable",
        nearestHospitalName: afterNode.nearestHospitalName,
      });
    }
  });

  return {
    beforeWithin8,
    afterWithin8,
    deltaWithin8,
    beforeWithin15,
    afterWithin15,
    deltaWithin15,
    unreachableOriginsCount: unreachableCount,
    newlyUnreachableCount,
    beforeAvgTime: beforeAvg,
    afterAvgTime: afterAvg,
    avgTimeIncrease,
    newlyCompromisedOrigins,
    thresholdMinutes,
  };
}
