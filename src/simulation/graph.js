import { distanceKm, coordinateKey } from "../utils/geo";

export const ROAD_SPEEDS = {
  motorway: 60,
  trunk: 50,
  primary: 40,
  secondary: 30,
  tertiary: 25,
  residential: 20,
  default: 25,
};

export const ROAD_CAPACITIES = {
  motorway: 2000,
  trunk: 1600,
  primary: 1200,
  secondary: 800,
  tertiary: 600,
  residential: 400,
  default: 500,
};

export function getRoadSpeed(highway) {
  const clean = String(highway || "").toLowerCase().split("_")[0];
  return ROAD_SPEEDS[clean] || ROAD_SPEEDS.default;
}

export function getRoadCapacity(highway, lanes = 1) {
  const clean = String(highway || "").toLowerCase().split("_")[0];
  const base = ROAD_CAPACITIES[clean] || ROAD_CAPACITIES.default;
  const numLanes = Math.max(1, parseInt(lanes, 10) || 1);
  return base * Math.min(numLanes, 4);
}

export function buildRoadGraph(roads = []) {
  const nodes = {};
  const adjacency = {};
  const roadEdges = {};
  const roadMeta = {};
  let totalEdgeSegments = 0;
  let totalNetworkLengthKm = 0;

  roads.forEach((road) => {
    const hw = String(road.highway || "road").toLowerCase().split("_")[0];
    const speedKmH = getRoadSpeed(hw);
    const capacity = getRoadCapacity(hw, road.lanes);

    roadMeta[road.id] = {
      id: road.id,
      name: road.name || "Unnamed Road",
      highway: hw,
      lanes: road.lanes || 1,
      speedKmH,
      capacity,
      maxspeed: road.maxspeed || speedKmH,
    };

    roadEdges[road.id] = [];
    const points = road.geometry;
    if (!points || points.length < 2) return;

    for (const point of points) {
      const key = coordinateKey(point.lat, point.lon);
      if (!nodes[key]) {
        nodes[key] = {
          id: key,
          lat: Number(point.lat),
          lon: Number(point.lon),
          degree: 0,
        };
      }
      if (!adjacency[key]) {
        adjacency[key] = [];
      }
    }

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const from = coordinateKey(a.lat, a.lon);
      const to = coordinateKey(b.lat, b.lon);
      const distance = distanceKm(a, b);
      const travelTimeMinutes = (distance / speedKmH) * 60;

      totalEdgeSegments += 2;
      totalNetworkLengthKm += distance;

      adjacency[from].push({
        node: to,
        distance,
        lengthMeters: Math.round(distance * 1000),
        travelTimeMinutes,
        speedKmH,
        capacity,
        roadId: road.id,
        highway: hw,
      });

      adjacency[to].push({
        node: from,
        distance,
        lengthMeters: Math.round(distance * 1000),
        travelTimeMinutes,
        speedKmH,
        capacity,
        roadId: road.id,
        highway: hw,
      });

      roadEdges[road.id].push({
        from,
        to,
        distance,
        lengthMeters: Math.round(distance * 1000),
        travelTimeMinutes,
      });

      nodes[from].degree++;
      nodes[to].degree++;
    }
  });

  const nodeCount = Object.keys(nodes).length;
  const intersectionCount = Object.values(nodes).filter((n) => n.degree >= 3).length;

  return {
    nodes,
    adjacency,
    roadEdges,
    roadMeta,
    stats: {
      roadCount: roads.length,
      nodeCount,
      intersectionCount,
      totalEdgeSegments,
      totalLengthKm: Number(totalNetworkLengthKm.toFixed(2)),
    },
  };
}

export function getODNodes(graph) {
  if (!graph?.nodes) return [];
  const candidates = Object.keys(graph.nodes).filter(
    (node) => graph.nodes[node].degree >= 3
  );
  const selected =
    candidates.length >= 2 ? candidates : Object.keys(graph.nodes);
  return selected.slice(0, 16);
}
