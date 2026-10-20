// ============================================================
// FLOOD WATERLOGGING HOTSPOTS CONFIGURATION
// Scope: Central Delhi Zone (Connaught Place, Minto Bridge, ITO, Tilak Bridge)
// DISCLAIMER:
// "demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed"
// All numbers, coordinates, and radiuses are illustrative.
// ============================================================

export const HOTSPOT_DATA_DISCLAIMER =
  "demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed";

export const FLOOD_HOTSPOTS = [
  {
    id: "minto-bridge",
    name: "Minto Bridge Railway Underpass",
    aliases: ["Minto Road RUB", "Shivaji Bridge Underpass", "Swami Vivekananda Marg Cut"],
    lat: 28.6362,
    lon: 77.2241,
    radiusMeters: 300,
    isDemo: true,
    source: "Delhi Traffic Police / PWD Vulnerable Underpass List (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "ito-vikas-marg",
    name: "ITO Junction / Vikas Marg Corridor",
    aliases: ["ITO Crossing", "Income Tax Office Chowk", "Vikas Marg Inundation Cut"],
    lat: 28.6293,
    lon: 77.2415,
    radiusMeters: 320,
    isDemo: true,
    source: "PWD Delhi Critical Waterlogging Hotspot Inventory (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "tilak-bridge",
    name: "Tilak Bridge Railway Underpass",
    aliases: ["Tilak Bridge RUB", "BSZ Marg Underpass", "Appu Ghar Railway Cut"],
    lat: 28.6258,
    lon: 77.2384,
    radiusMeters: 280,
    isDemo: true,
    source: "Delhi Traffic Police Annual Waterlogging Spot Advisory (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "cp-outer-circle",
    name: "Connaught Place Outer Circle (Minto Cut)",
    aliases: ["Connaught Circus Outer Ring", "CP Radial 1 Minto Junction", "Statesman House Cut"],
    lat: 28.6348,
    lon: 77.2205,
    radiusMeters: 260,
    isDemo: true,
    source: "NDMC Monsoon Preparedness Critical Inundation List (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "w-point-ring-road",
    name: "W-Point / Vikas Marg & Ring Road Loop",
    aliases: ["W-Point Crossing", "IP Estate Loop", "Ring Road ITO Flyover Inundation Base"],
    lat: 28.6310,
    lon: 77.2435,
    radiusMeters: 280,
    isDemo: true,
    source: "PWD Delhi Monitored Flood Inundation Spot (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "delhi-gate",
    name: "Delhi Gate / Asaf Ali Road Inundation Point",
    aliases: ["Delhi Gate Crossing", "Asaf Ali Road RUB Cut", "LNJP Hospital North Approach"],
    lat: 28.6405,
    lon: 77.2400,
    radiusMeters: 260,
    isDemo: true,
    source: "MCD City-SP Zone Waterlogging Vulnerability Register (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "mandi-house",
    name: "Mandi House & Sikandra Road Circle",
    aliases: ["Mandi House Roundabout", "Sikandra Road Crossing", "Barakhamba Link"],
    lat: 28.6255,
    lon: 77.2340,
    radiusMeters: 250,
    isDemo: true,
    source: "NDMC Drainage Masterplan Sensitive Node (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "barakhamba-tolstoy",
    name: "Barakhamba Road & Tolstoy Marg Junction",
    aliases: ["Barakhamba Crossing", "Tolstoy Marg Junction", "CP Radial 4 Approach"],
    lat: 28.6288,
    lon: 77.2255,
    radiusMeters: 240,
    isDemo: true,
    source: "NDMC Monsoon Preparedness List (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
  {
    id: "bhairon-marg",
    name: "Bhairon Marg Railway Underpass",
    aliases: ["Bhairon Marg RUB", "Pragati Maidan Railway Underpass", "Ring Road Cut"],
    lat: 28.6160,
    lon: 77.2465,
    radiusMeters: 300,
    isDemo: true,
    source: "Delhi Traffic Police Underpass Waterlogging Advisory (demo hotspots, based on public PWD/Delhi Traffic Police lists, not surveyed)",
  },
];

// Rainfall level multipliers:
// Moderate = 40% of radius
// Heavy = 70% of radius
// Extreme = 100% of radius
export const RAINFALL_LEVELS = {
  Moderate: { multiplier: 0.4, label: "Moderate (40% radius)", description: "Localized inundation at low depression" },
  Heavy: { multiplier: 0.7, label: "Heavy (70% radius)", description: "Full underpass depression inundated" },
  Extreme: { multiplier: 1.0, label: "Extreme (100% radius)", description: "Severe cloudburst spillover to radial feeders" },
};

// Compute effective radius in meters based on rainfall level
export function getEffectiveRadius(hotspot, rainfallLevel = "Extreme") {
  const config = RAINFALL_LEVELS[rainfallLevel] || RAINFALL_LEVELS.Extreme;
  return Math.round(hotspot.radiusMeters * config.multiplier);
}

// Helper: Haversine distance in meters between two lat/lon points
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find all road IDs that intersect any flood hotspot radius under selected rainfall level
export function getRoadsInFloodHotspots(
  roads,
  hotspots = FLOOD_HOTSPOTS,
  rainfallLevel = "Extreme"
) {
  const results = getFloodIntersectionResults(roads, hotspots, rainfallLevel);
  return results.floodedRoadIds;
}

// Find roads intersecting a single hotspot
export function getRoadsInSingleHotspot(
  roads,
  hotspot,
  rainfallLevel = "Extreme"
) {
  const floodedRoadIds = new Set();
  const effectiveRadius = getEffectiveRadius(hotspot, rainfallLevel);
  if (!roads || roads.length === 0) return floodedRoadIds;

  roads.forEach((road) => {
    if (!road.geometry || road.geometry.length === 0) return;
    const isHit = road.geometry.some((pt) => {
      const lat = Number(pt.lat);
      const lon = Number(pt.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
      return haversineDistanceMeters(lat, lon, hotspot.lat, hotspot.lon) <= effectiveRadius;
    });
    if (isHit) {
      floodedRoadIds.add(String(road.id));
    }
  });

  return floodedRoadIds;
}

// Comprehensive intersection computation
export function getFloodIntersectionResults(
  roads,
  hotspots = FLOOD_HOTSPOTS,
  rainfallLevel = "Extreme"
) {
  const floodedRoadIds = new Set();
  const intersectedHotspots = [];
  const nonIntersectedHotspots = [];

  if (!roads || roads.length === 0) {
    return {
      floodedRoadIds,
      intersectedHotspots,
      nonIntersectedHotspots: hotspots,
      totalFloodedRoads: 0,
      hasIntersections: false,
    };
  }

  hotspots.forEach((hotspot) => {
    const effectiveRadius = getEffectiveRadius(hotspot, rainfallLevel);
    const intersectedRoadsForThisHotspot = [];

    roads.forEach((road) => {
      if (!road.geometry || road.geometry.length === 0) return;
      const isHit = road.geometry.some((pt) => {
        const lat = Number(pt.lat);
        const lon = Number(pt.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
        return haversineDistanceMeters(lat, lon, hotspot.lat, hotspot.lon) <= effectiveRadius;
      });

      if (isHit) {
        floodedRoadIds.add(String(road.id));
        intersectedRoadsForThisHotspot.push({
          id: String(road.id),
          name: road.name || `Corridor #${road.id}`,
          highway: road.highway || "road",
        });
      }
    });

    if (intersectedRoadsForThisHotspot.length > 0) {
      intersectedHotspots.push({
        ...hotspot,
        effectiveRadius,
        rainfallLevel,
        roadCount: intersectedRoadsForThisHotspot.length,
        roads: intersectedRoadsForThisHotspot,
      });
    } else {
      nonIntersectedHotspots.push({
        ...hotspot,
        effectiveRadius,
        rainfallLevel,
        roadCount: 0,
        roads: [],
      });
    }
  });

  return {
    floodedRoadIds,
    intersectedHotspots,
    nonIntersectedHotspots,
    totalFloodedRoads: floodedRoadIds.size,
    hasIntersections: floodedRoadIds.size > 0,
  };
}

export function isUsingDemoFloodHotspots(hotspots = FLOOD_HOTSPOTS) {
  return hotspots.some((h) => h.isDemo);
}
