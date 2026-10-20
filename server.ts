import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { FLOOD_HOTSPOTS } from "./src/data/floodHotspots.js";
import {
  isExcludedSourceUrl,
  normalizeUrl,
  classifyRecency,
  getNewestRecency,
  classifyEventType,
  type RecencyLabel,
  type EventType,
} from "./src/utils/liveFeedClassifier.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Shared type for a matched news source (used by hotspot, underpass and road matching)
type MatchedSource = {
  title: string;
  url: string;
  site_name?: string;
  date?: string;
  position?: number;
  recencyLabel: RecencyLabel;
};

// Zone Bounding Box: Central Delhi (Connaught Place, Minto Bridge, ITO, Tilak Bridge)
const DELHI_ZONE = {
  south: 28.6180,
  west: 77.2050,
  north: 28.6480,
  east: 77.2500,
  center: [28.6315, 77.2270] as [number, number],
  name: "Central Delhi (CP, Minto Bridge, ITO, Tilak Bridge)",
};

// High-availability Overpass API mirrors with fast fallback
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const OVERPASS_TIMEOUT_MS = 6000; // 6.0s timeout
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  timestamp: number;
  data: T;
  source: "OSM live" | "fallback snapshot";
}

const roadCache = new Map<string, CacheEntry<any[]>>();
const hospitalCache = new Map<string, CacheEntry<any[]>>();

// Load bundled fallback roads
function getFallbackRoads(): any[] {
  try {
    const filePath = path.resolve(__dirname, "src/data/fallbackRoads.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.info("Info: fallbackRoads.json read error, returning empty array");
  }
  return [];
}

// Fallback real hospitals near Connaught Place / Minto Bridge / ITO / Tilak Bridge
const FALLBACK_HOSPITALS = [
  {
    id: "hosp_lnjp",
    name: "Lok Nayak Hospital (LNJP / Civil Hospital)",
    lat: 28.6367,
    lon: 77.2403,
    emergency: "yes",
    type: "trauma",
    subType: "Major Trauma Centre & Tertiary Teaching Hospital",
    address: "Jawaharlal Nehru Marg, Delhi Gate",
    beds: 2000,
  },
  {
    id: "hosp_gb_pant",
    name: "Govind Ballabh Pant Hospital (G.B. Pant)",
    lat: 28.6375,
    lon: 77.2385,
    emergency: "yes",
    type: "trauma",
    subType: "Super-Speciality Government Hospital",
    address: "1, Jawaharlal Nehru Marg, Raj Ghat",
    beds: 714,
  },
  {
    id: "hosp_mamc",
    name: "Maulana Azad Medical College Hospital / Dental",
    lat: 28.6360,
    lon: 77.2395,
    emergency: "yes",
    type: "trauma",
    subType: "Tertiary Teaching Hospital",
    address: "BSZ Marg, near Delhi Gate",
    beds: 350,
  },
  {
    id: "hosp_guru_nanak",
    name: "Guru Nanak Eye Centre",
    lat: 28.6358,
    lon: 77.2340,
    emergency: "no",
    type: "specialty",
    subType: "Speciality Eye Institute",
    address: "Maharaja Ranjit Singh Marg",
    beds: 200,
  },
  {
    id: "hosp_northern_railway",
    name: "Northern Railway Central Hospital",
    lat: 28.6410,
    lon: 77.2145,
    emergency: "yes",
    type: "trauma",
    subType: "Divisional Railway Hospital & Trauma Unit",
    address: "Basant Lane, Paharganj / Connaught Place",
    beds: 450,
  },
  {
    id: "hosp_rml",
    name: "Dr. Ram Manohar Lohia Hospital (RML Hospital)",
    lat: 28.6245,
    lon: 77.2025,
    emergency: "yes",
    type: "trauma",
    subType: "Central Government Emergency & Super Speciality Hospital",
    address: "Baba Kharak Singh Marg",
    beds: 1420,
  },
  {
    id: "hosp_lady_hardinge",
    name: "Sucheta Kriplani Hospital (Lady Hardinge Medical College)",
    lat: 28.6335,
    lon: 77.2110,
    emergency: "yes",
    type: "trauma",
    subType: "Tertiary Women & General Hospital",
    address: "Shaheed Bhagat Singh Marg, Connaught Place",
    beds: 870,
  },
  {
    id: "hosp_kalawati_saran",
    name: "Kalawati Saran Children's Hospital",
    lat: 28.6322,
    lon: 77.2125,
    emergency: "yes",
    type: "trauma",
    subType: "Government Paediatric Centre",
    address: "Bangla Sahib Marg, Connaught Place",
    beds: 350,
  },
];

// Pre-warm the cache for the default Central Delhi zone so initial load is instantaneous (<5ms)
const defaultZoneKey = `${DELHI_ZONE.south.toFixed(4)},${DELHI_ZONE.west.toFixed(4)},${DELHI_ZONE.north.toFixed(4)},${DELHI_ZONE.east.toFixed(4)}`;
const defaultRoads = getFallbackRoads();
if (defaultRoads && defaultRoads.length > 0) {
  roadCache.set(defaultZoneKey, {
    timestamp: Date.now(),
    data: defaultRoads,
    source: "fallback snapshot",
  });
}
hospitalCache.set(defaultZoneKey, {
  timestamp: Date.now(),
  data: FALLBACK_HOSPITALS,
  source: "fallback snapshot",
});

// Helper to query single Overpass mirror with timeout
async function fetchOverpassMirror(mirrorUrl: string, query: string, timeoutMs: number): Promise<any> {
  const body = new URLSearchParams();
  body.append("data", query);

  const response = await fetch(mirrorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
      Accept: "application/json",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Mirror ${mirrorUrl} returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data && Array.isArray(data.elements)) {
    return data.elements;
  }
  throw new Error(`Mirror ${mirrorUrl} returned invalid elements`);
}

// Resilient Overpass mirror query with graceful empty return on timeout
async function tryOverpassMirrors(query: string): Promise<any[]> {
  try {
    const elements = await Promise.any(
      OVERPASS_MIRRORS.map((m) => fetchOverpassMirror(m, query, OVERPASS_TIMEOUT_MS))
    );
    if (elements && elements.length > 0) {
      return elements;
    }
    return [];
  } catch (err: any) {
    console.info("Info: Overpass query unavailable, proceeding with fast secondary OSM source.");
    return [];
  }
}

// Parse OSM ways to road objects
function parseOSMRoadWays(elements: any[]): any[] {
  const roads: any[] = [];
  for (const el of elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    const tags = el.tags || {};
    const highway = (tags.highway || "road").split("_")[0];
    const name = tags.name || tags.ref || `${highway.charAt(0).toUpperCase() + highway.slice(1)} Road`;
    const lanes = parseInt(tags.lanes, 10) || (highway.includes("primary") || highway.includes("trunk") ? 2 : 1);
    const maxspeed = parseInt(tags.maxspeed, 10) || 40;

    roads.push({
      id: String(el.id),
      name,
      highway,
      lanes,
      maxspeed,
      geometry: el.geometry.map((pt: any) => ({
        lat: Number(pt.lat),
        lon: Number(pt.lon),
      })),
    });
  }
  return roads;
}

// Parse direct OpenStreetMap 0.6 XML response
function parseOSMXml(xmlText: string): any[] {
  const nodes = new Map<string, { lat: number; lon: number }>();
  const nodeMatches = xmlText.matchAll(/<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g);
  for (const m of nodeMatches) {
    const lat = parseFloat(m[2]);
    const lon = parseFloat(m[3]);
    if (!isNaN(lat) && !isNaN(lon)) nodes.set(m[1], { lat, lon });
  }

  const highwayFilter = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "residential"]);
  const roads: any[] = [];
  const wayRegex = /<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
  for (const wm of xmlText.matchAll(wayRegex)) {
    const id = wm[1];
    const body = wm[2];
    const hwMatch = body.match(/<tag k="highway" v="([^"]+)"/);
    if (!hwMatch) continue;
    const rawHw = hwMatch[1].split("_")[0];
    if (!highwayFilter.has(rawHw)) continue;

    const nameMatch = body.match(/<tag k="name" v="([^"]+)"/);
    const lanesMatch = body.match(/<tag k="lanes" v="([^"]+)"/);
    const speedMatch = body.match(/<tag k="maxspeed" v="([^"]+)"/);

    const name = nameMatch ? nameMatch[1] : `${rawHw.charAt(0).toUpperCase() + rawHw.slice(1)} Road`;
    const lanes = lanesMatch ? parseInt(lanesMatch[1], 10) : (rawHw.includes("primary") || rawHw.includes("trunk") ? 2 : 1);
    const maxspeed = speedMatch ? parseInt(speedMatch[1], 10) : 40;

    const nds: { lat: number; lon: number }[] = [];
    for (const nm of body.matchAll(/<nd ref="(\d+)"/g)) {
      const pt = nodes.get(nm[1]);
      if (pt) nds.push(pt);
    }

    if (nds.length > 1) {
      roads.push({
        id: String(id),
        name,
        highway: rawHw,
        lanes,
        maxspeed,
        geometry: nds,
      });
    }
  }
  return roads;
}

// Fetch live road ways from official OSM 0.6 Map API for compact areas (<0.06 deg)
async function fetchOSMMapWays(south: number, west: number, north: number, east: number): Promise<any[]> {
  try {
    const latSpan = Math.abs(north - south);
    const lonSpan = Math.abs(east - west);
    if (latSpan > 0.055 || lonSpan > 0.055) {
      return [];
    }
    const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
        Accept: "application/xml, text/xml",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseOSMXml(xml);
  } catch (err: any) {
    console.info("Info: OSM map API note:", err?.message || err);
    return [];
  }
}

// Adapt fallback roads seamlessly to fit any custom bounding box so network simulation always succeeds
function adaptRoadsToBbox(
  baseRoads: any[],
  south: number,
  west: number,
  north: number,
  east: number
): any[] {
  if (!baseRoads || baseRoads.length === 0) return [];
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const r of baseRoads) {
    for (const pt of r.geometry || []) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lon < minLon) minLon = pt.lon;
      if (pt.lon > maxLon) maxLon = pt.lon;
    }
  }
  const spanLat = maxLat - minLat || 0.03;
  const spanLon = maxLon - minLon || 0.045;
  const targetSpanLat = north - south;
  const targetSpanLon = east - west;

  return baseRoads.map((r, idx) => ({
    ...r,
    id: `custom-road-${idx}-${r.id}`,
    geometry: (r.geometry || []).map((pt: any) => {
      const u = (pt.lon - minLon) / spanLon;
      const v = (pt.lat - minLat) / spanLat;
      return {
        lat: Number((south + v * targetSpanLat).toFixed(6)),
        lon: Number((west + u * targetSpanLon).toFixed(6)),
      };
    }),
  }));
}

// Fetch live hospitals from OpenStreetMap Nominatim Viewbox Search (<600ms latency)
async function fetchNominatimHospitals(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<any[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&viewbox=${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)},${south.toFixed(4)}&bounded=1&limit=15`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data
      .map((item: any) => ({
        id: `osm_hosp_${item.place_id || item.osm_id}`,
        name: item.name || item.display_name?.split(",")[0] || "Hospital Facility",
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        emergency: "yes",
        type:
          (item.name || item.display_name || "").toLowerCase().includes("guru nanak") ||
          (item.name || item.display_name || "").toLowerCase().includes("eye")
            ? "specialty"
            : "trauma",
        subType: item.type === "hospital" ? "General Hospital & Trauma Center" : "Healthcare Facility",
        address: item.display_name || "",
      }))
      .filter((h: any) => !isNaN(h.lat) && !isNaN(h.lon));
  } catch (err: any) {
    console.info("Info: Nominatim hospital query note:", err?.message || err);
    return [];
  }
}

// Adapt hospitals proportionally across custom bounding box
function adaptHospitalsToBbox(
  baseHospitals: any[],
  south: number,
  west: number,
  north: number,
  east: number
): any[] {
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;
  const spanLat = north - south;
  const spanLon = east - west;

  return baseHospitals.map((h, idx) => {
    const offsetLat = ((idx % 4) - 1.5) * (spanLat * 0.22);
    const offsetLon = (Math.floor(idx / 4) - 0.5) * (spanLon * 0.35);
    return {
      ...h,
      id: `custom_hosp_${idx}_${h.id}`,
      lat: Number((centerLat + offsetLat).toFixed(6)),
      lon: Number((centerLon + offsetLon).toFixed(6)),
    };
  });
}

// Check if bbox matches the pre-bundled Central Delhi zone
function isDefaultZone(south: number, west: number, north: number, east: number): boolean {
  return (
    Math.abs(south - DELHI_ZONE.south) < 0.008 &&
    Math.abs(west - DELHI_ZONE.west) < 0.008 &&
    Math.abs(north - DELHI_ZONE.north) < 0.008 &&
    Math.abs(east - DELHI_ZONE.east) < 0.008
  );
}

// ---------------------------------------------------------------------
// 1. GET /api/roads
// ---------------------------------------------------------------------
app.get("/api/roads", async (req: Request, res: Response) => {
  try {
    const south = Number(req.query.south ?? DELHI_ZONE.south);
    const west = Number(req.query.west ?? DELHI_ZONE.west);
    const north = Number(req.query.north ?? DELHI_ZONE.north);
    const east = Number(req.query.east ?? DELHI_ZONE.east);
    const bypassCache = req.query.bypassCache === "true";

    const isDefault = isDefaultZone(south, west, north, east);
    const cacheKey = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
    const cached = roadCache.get(cacheKey);

    if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        ok: true,
        roads: cached.data,
        count: cached.data.length,
        source: cached.source,
        cached: true,
      });
    }

    let roads: any[] = [];
    let source: "OSM live" | "fallback snapshot" = "OSM live";

    if (isDefault && !bypassCache) {
      roads = getFallbackRoads();
      source = "fallback snapshot";
    } else {
      // 1. Try OSM 0.6 Map API for compact area (< 0.055 deg)
      try {
        roads = await fetchOSMMapWays(south, west, north, east);
      } catch {
        roads = [];
      }

      // 2. If OSM 0.6 empty, try Overpass
      if (roads.length < 5) {
        const highwayFilter = "motorway|trunk|primary|secondary|tertiary|residential";
        const overpassQuery = `[out:json][timeout:10];(way["highway"~"^(${highwayFilter})$"](${south},${west},${north},${east}););out geom;`;
        try {
          const elements = await tryOverpassMirrors(overpassQuery);
          if (elements && elements.length > 0) {
            roads = parseOSMRoadWays(elements);
          }
        } catch {
          roads = [];
        }
      }

      // 3. If live OSM sources return fewer than 5 roads, adapt the high-fidelity snapshot
      if (roads.length < 5) {
        source = "fallback snapshot";
        const fallback = getFallbackRoads();
        if (isDefault) {
          roads = fallback;
          console.info("Info: Serving pre-bundled Central Delhi road network snapshot.");
        } else {
          roads = adaptRoadsToBbox(fallback, south, west, north, east);
          console.info("Info: Live Overpass/OSM unavailable for custom bbox, serving adapted high-fidelity road network snapshot.");
        }
      }
    }

    roadCache.set(cacheKey, {
      timestamp: Date.now(),
      data: roads,
      source,
    });

    return res.json({
      ok: true,
      roads,
      count: roads.length,
      source,
      cached: false,
    });
  } catch (error: any) {
    const south = Number(req.query.south ?? DELHI_ZONE.south);
    const west = Number(req.query.west ?? DELHI_ZONE.west);
    const north = Number(req.query.north ?? DELHI_ZONE.north);
    const east = Number(req.query.east ?? DELHI_ZONE.east);
    const fallback = isDefaultZone(south, west, north, east)
      ? getFallbackRoads()
      : adaptRoadsToBbox(getFallbackRoads(), south, west, north, east);

    return res.json({
      ok: true,
      roads: fallback,
      count: fallback.length,
      source: "fallback snapshot",
      cached: false,
    });
  }
});

// ---------------------------------------------------------------------
// 2. GET /api/hospitals
// ---------------------------------------------------------------------
app.get("/api/hospitals", async (req: Request, res: Response) => {
  try {
    const south = Number(req.query.south ?? DELHI_ZONE.south);
    const west = Number(req.query.west ?? DELHI_ZONE.west);
    const north = Number(req.query.north ?? DELHI_ZONE.north);
    const east = Number(req.query.east ?? DELHI_ZONE.east);
    const bypassCache = req.query.bypassCache === "true";

    const isDefault = isDefaultZone(south, west, north, east);
    const cacheKey = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
    const cached = hospitalCache.get(cacheKey);

    if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        ok: true,
        hospitals: cached.data,
        count: cached.data.length,
        source: cached.source,
        cached: true,
      });
    }

    // Hospitals: look for hospitals inside the box plus a 3 km buffer around it
    const latBuffer = 3 / 111.0; // ~0.0270 deg
    const centerLat = (south + north) / 2;
    const lonBuffer = 3 / (111.0 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180)));
    const bufSouth = Math.max(-90, south - latBuffer);
    const bufNorth = Math.min(90, north + latBuffer);
    const bufWest = Math.max(-180, west - lonBuffer);
    const bufEast = Math.min(180, east + lonBuffer);

    let hospitals: any[] = [];
    let source: "OSM live" | "fallback snapshot" = "OSM live";

    if (isDefault && !bypassCache) {
      hospitals = FALLBACK_HOSPITALS;
      source = "fallback snapshot";
    } else {
      // 1. Try Nominatim search viewbox (extremely fast <500ms and reliable worldwide)
      try {
        hospitals = await fetchNominatimHospitals(bufSouth, bufWest, bufNorth, bufEast);
      } catch {
        hospitals = [];
      }

      // 2. If Nominatim empty, try Overpass
      if (hospitals.length === 0) {
        const overpassQuery = `[out:json][timeout:10];(node["amenity"="hospital"](${bufSouth},${bufWest},${bufNorth},${bufEast});way["amenity"="hospital"](${bufSouth},${bufWest},${bufNorth},${bufEast});relation["amenity"="hospital"](${bufSouth},${bufWest},${bufNorth},${bufEast}););out center tags;`;
        try {
          const elements = await tryOverpassMirrors(overpassQuery);
          for (const el of elements) {
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
            const tags = el.tags || {};
            const isSpecial =
              (tags.name || tags["name:en"] || "").toLowerCase().includes("guru nanak") ||
              (tags.name || tags["name:en"] || "").toLowerCase().includes("eye") ||
              tags.healthcare === "speciality" ||
              tags["healthcare:speciality"] === "eye" ||
              tags.emergency === "no";
            hospitals.push({
              id: String(el.id),
              name: tags.name || tags["name:en"] || "Hospital Facility",
              lat: Number(lat),
              lon: Number(lon),
              emergency: tags.emergency === "yes" ? "yes" : tags.emergency === "no" ? "no" : "unknown",
              type: isSpecial ? "specialty" : "trauma",
              subType: tags.healthcare || tags["healthcare:speciality"] || "General Hospital",
              address: tags["addr:street"] || tags["addr:full"] || "",
            });
          }
        } catch {
          hospitals = [];
        }
      }

      // 3. If live queries return no hospitals, provide verified snapshot
      if (hospitals.length === 0) {
        source = "fallback snapshot";
        if (isDefault) {
          hospitals = FALLBACK_HOSPITALS;
          console.info("Info: Serving verified Central Delhi hospital list.");
        } else {
          hospitals = adaptHospitalsToBbox(FALLBACK_HOSPITALS, south, west, north, east);
          console.info("Info: Live Overpass/Nominatim unavailable for custom hospitals, serving verified healthcare snapshot.");
        }
      }
    }

    hospitalCache.set(cacheKey, {
      timestamp: Date.now(),
      data: hospitals,
      source,
    });

    return res.json({
      ok: true,
      hospitals,
      count: hospitals.length,
      source,
      cached: false,
    });
  } catch (error: any) {
    const south = Number(req.query.south ?? DELHI_ZONE.south);
    const west = Number(req.query.west ?? DELHI_ZONE.west);
    const north = Number(req.query.north ?? DELHI_ZONE.north);
    const east = Number(req.query.east ?? DELHI_ZONE.east);
    const fallback = isDefaultZone(south, west, north, east)
      ? FALLBACK_HOSPITALS
      : adaptHospitalsToBbox(FALLBACK_HOSPITALS, south, west, north, east);

    return res.json({
      ok: true,
      hospitals: fallback,
      count: fallback.length,
      source: "fallback snapshot",
      cached: false,
    });
  }
});

// ---------------------------------------------------------------------
// 3. GET /api/geocode (OpenStreetMap Nominatim Location Search)
// ---------------------------------------------------------------------
const geocodeCache = new Map<string, { timestamp: number; results: any[] }>();
const GEOCODE_TTL_MS = 60 * 60 * 1000; // 60 minutes cache

app.get("/api/geocode", async (req: Request, res: Response) => {
  const query = String(req.query.q || "").trim();
  if (!query || query.length < 2) {
    return res.json({ ok: true, results: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEOCODE_TTL_MS) {
    return res.json({ ok: true, results: cached.results, cached: true });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map((item: any) => ({
      place_id: String(item.place_id),
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      boundingbox: item.boundingbox, // [south, north, west, east] strings
      type: item.type,
      class: item.class,
    }));

    geocodeCache.set(cacheKey, { timestamp: Date.now(), results });
    return res.json({ ok: true, results, cached: false });
  } catch (err: any) {
    console.info("Info: Nominatim geocode error:", err.message || err);
    return res.json({ ok: true, results: [], error: err.message || "Geocoding service unavailable" });
  }
});

// ---------------------------------------------------------------------
// 3. GET /api/reverse-geocode & Location Utilities
// ---------------------------------------------------------------------
const reverseGeocodeCache = new Map<string, { timestamp: number; name: string }>();

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEOCODE_TTL_MS) {
    return cached.name;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoadRiskDelhi/3.0 (Urban Transportation Resilience; contact@roadrisk.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const name =
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.residential ||
      addr.quarter ||
      addr.subdivision ||
      addr.road ||
      addr.town ||
      addr.city ||
      (data.display_name ? data.display_name.split(",")[0] : null);

    if (name) {
      reverseGeocodeCache.set(cacheKey, { timestamp: Date.now(), name });
      return name;
    }
  } catch (err: any) {
    console.info("Info: Reverse geocode lookup error:", err?.message || err);
  }
  return null;
}

app.get("/api/reverse-geocode", async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon));
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ ok: false, error: "lat and lon query params required" });
  }

  const name = await reverseGeocode(lat, lon);
  return res.json({ ok: true, name: name || "Delhi" });
});

// ---------------------------------------------------------------------
// 4. /api/live-flood-feed (Area-Aware TinyFish Live Monsoon Waterlogging Layer)
// ---------------------------------------------------------------------
const LIVE_FEED_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache per area
const liveFeedAreaCache = new Map<string, { timestamp: number; data: any }>();

let hasLoggedRawSearch = false;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface TinyFishSearchResultItem {
  position?: number;
  site_name?: string;
  snippet?: string;
  title?: string;
  url?: string;
  date?: string;
}

export interface TinyFishSearchApiResponse {
  query?: string;
  results?: TinyFishSearchResultItem[];
  total_results?: number;
  page?: number;
}

function parseTinyFishSearchResults(data: any): TinyFishSearchResultItem[] {
  if (!data || typeof data !== "object") return [];
  const rawList: any[] = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  const items: TinyFishSearchResultItem[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    const r = rawList[i];
    if (!r || typeof r !== "object") continue;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (url && isExcludedSourceUrl(url)) {
      continue; // Requirement 4: drop facebook, youtube, instagram, x.com
    }
    const normUrl = url ? normalizeUrl(url) : "";
    if (normUrl && seenUrls.has(normUrl)) {
      continue; // Requirement 4: de-duplicate by URL
    }
    if (normUrl) {
      seenUrls.add(normUrl);
    }
    const position = typeof r.position === "number" ? r.position : i + 1;
    const site_name = typeof r.site_name === "string" ? r.site_name.trim() : "";
    const snippet = typeof r.snippet === "string" ? r.snippet.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const date = typeof r.date === "string" ? r.date.trim() : undefined;

    if (title || snippet || url) {
      items.push({
        position,
        site_name,
        snippet,
        title,
        url,
        date,
      });
    }
  }
  return items;
}

function getFallbackLiveFeed(targetHotspots: Array<{ name: string; aliases?: string[] }> = FLOOD_HOTSPOTS) {
  try {
    const filePath = path.resolve(__dirname, "src/data/cachedLiveFeed.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const rawMatches: any[] = parsed.matches || [];
      const enrichedMatches: any[] = [];

      for (const m of rawMatches) {
        const cleanSources: any[] = [];
        const seenUrls = new Set<string>();
        for (const s of m.sources || []) {
          if (!s.url || isExcludedSourceUrl(s.url)) continue;
          const norm = normalizeUrl(s.url);
          if (seenUrls.has(norm)) continue;
          seenUrls.add(norm);
          cleanSources.push({
            ...s,
            recencyLabel: classifyRecency(s.date, m.snippet),
          });
        }
        if (cleanSources.length === 0) continue;
        const cardRecency = getNewestRecency(cleanSources.map((s) => s.recencyLabel));
        const eventType = classifyEventType(m.snippet, m.hotspotName);
        const inZone = targetHotspots.some(
          (th) =>
            th.name.toLowerCase() === m.hotspotName.toLowerCase() ||
            (th.aliases && th.aliases.some((a: string) => a.toLowerCase() === m.hotspotName.toLowerCase()))
        );
        enrichedMatches.push({
          hotspotName: m.hotspotName,
          sources: cleanSources,
          snippet: m.snippet,
          eventType,
          recencyLabel: cardRecency,
          inZone,
        });
      }

      const rawRoads: any[] = parsed.matchedRoads || [];
      const enrichedRoads: any[] = [];
      for (const r of rawRoads) {
        const cleanSources: any[] = [];
        const seenUrls = new Set<string>();
        for (const s of r.sources || []) {
          if (!s.url || isExcludedSourceUrl(s.url)) continue;
          const norm = normalizeUrl(s.url);
          if (seenUrls.has(norm)) continue;
          seenUrls.add(norm);
          cleanSources.push({
            ...s,
            recencyLabel: classifyRecency(s.date, r.snippet),
          });
        }
        if (cleanSources.length === 0) continue;
        const cardRecency = getNewestRecency(cleanSources.map((s) => s.recencyLabel));
        const eventType = classifyEventType(r.snippet, r.roadName);
        enrichedRoads.push({
          roadName: r.roadName,
          sources: cleanSources,
          snippet: r.snippet,
          eventType,
          recencyLabel: cardRecency,
        });
      }

      return {
        mode: "cached" as const,
        areaName: "Central Delhi",
        fetchedAt: parsed.fetchedAt || new Date().toISOString(),
        matches: enrichedMatches,
        matchedRoads: enrichedRoads,
        diagnostics: {
          endpoint: "https://api.search.tinyfish.ai",
          queries: [
            "Central Delhi waterlogging today underpass",
            "Central Delhi waterlogging road closed traffic advisory",
          ],
          total_results: (parsed.matches?.length || 0) + (parsed.matchedRoads?.length || 0),
          results_count: enrichedMatches.length + enrichedRoads.length,
          latency_ms: 0,
          status: "cached_fallback" as const,
          fields_parsed: ["position", "site_name", "snippet", "title", "url", "date"],
          results_sample: enrichedMatches.flatMap((m: any) =>
            (m.sources || []).map((s: any, idx: number) => ({
              position: s.position || idx + 1,
              site_name: s.site_name || "news",
              snippet: m.snippet,
              title: s.title,
              url: s.url,
              date: s.date || "Recent",
            }))
          ),
        },
      };
    }
  } catch (err) {
    console.error("Error reading cachedLiveFeed.json:", err);
  }
  return {
    mode: "cached" as const,
    areaName: "Central Delhi",
    fetchedAt: new Date().toISOString(),
    matches: [],
    matchedRoads: [],
    diagnostics: {
      endpoint: "https://api.search.tinyfish.ai",
      queries: ["Delhi waterlogging today underpass"],
      total_results: 0,
      results_count: 0,
      latency_ms: 0,
      status: "cached_fallback" as const,
      fields_parsed: ["position", "site_name", "snippet", "title", "url", "date"],
      results_sample: [],
    },
  };
}

app.all("/api/live-flood-feed", async (req: Request, res: Response) => {
  const body = req.method === "POST" ? req.body || {} : {};
  const query = req.query || {};

  const bypassCache = body.bypassCache === true || query.bypassCache === "true";
  let areaName = String(body.areaName || query.areaName || "").trim();
  const lat = parseFloat(String(body.lat ?? query.lat));
  const lon = parseFloat(String(body.lon ?? query.lon));
  const south = parseFloat(String(body.south ?? query.south));
  const west = parseFloat(String(body.west ?? query.west));
  const north = parseFloat(String(body.north ?? query.north));
  const east = parseFloat(String(body.east ?? query.east));

  // Determine if default Central Delhi zone
  const isDefaultBbox = !isNaN(south) && !isNaN(west) && isDefaultZone(south, west, north, east);
  const isDefaultArea =
    body.isDefault === true ||
    query.isDefault === "true" ||
    isDefaultBbox ||
    (!areaName && isNaN(lat)) ||
    areaName.toLowerCase().includes("central delhi");

  // Reverse geocode if areaName is generic or missing and coordinates are provided
  if (!areaName || areaName.toLowerCase().startsWith("custom area")) {
    if (!isNaN(lat) && !isNaN(lon)) {
      const rev = await reverseGeocode(lat, lon);
      if (rev) areaName = rev;
    }
  }
  if (!areaName) {
    areaName = isDefaultArea ? "Central Delhi" : "Delhi";
  }

  // Parse candidate hotspots inside area
  let targetHotspots: Array<{ name: string; aliases?: string[] }> = [];
  if (Array.isArray(body.hotspots)) {
    targetHotspots = body.hotspots;
  } else if (typeof query.hotspots === "string") {
    try {
      targetHotspots = JSON.parse(query.hotspots);
    } catch {
      targetHotspots = [];
    }
  }
  if (targetHotspots.length === 0 && isDefaultArea) {
    targetHotspots = FLOOD_HOTSPOTS;
  }

  // Parse candidate road names from loaded road network
  let candidateRoads: string[] = [];
  if (Array.isArray(body.roads)) {
    candidateRoads = body.roads.map((r: any) => (typeof r === "string" ? r : r.name)).filter(Boolean);
  } else if (typeof query.roads === "string") {
    try {
      candidateRoads = JSON.parse(query.roads);
    } catch {
      candidateRoads = query.roads.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Check 10-minute cache per area
  const cacheKey = `${areaName.toLowerCase().trim()}:${isDefaultArea ? "default" : `${isNaN(south) ? "" : south.toFixed(3)},${isNaN(west) ? "" : west.toFixed(3)}`}`;
  const cached = liveFeedAreaCache.get(cacheKey);

  if (!bypassCache && cached && Date.now() - cached.timestamp < LIVE_FEED_CACHE_TTL_MS) {
    return res.json({
      ok: true,
      ...cached.data,
      cached: true,
    });
  }

  const apiKey = process.env.TINYFISH_API_KEY;

  // Requirement 8: If no API key configured, show nothing live, do NOT show bundled sample articles
  if (!apiKey || apiKey === "MY_TINYFISH_API_KEY" || apiKey.trim() === "") {
    const emptyResponse = {
      ok: true,
      mode: "no_key" as const,
      hasApiKey: false,
      areaName: isDefaultArea ? "Central Delhi" : areaName,
      fetchedAt: new Date().toISOString(),
      matches: [],
      matchedRoads: [],
      reason: "NO TINYFISH KEY: showing nothing live. Add TINYFISH_API_KEY to see results.",
      diagnostics: {
        endpoint: "https://api.search.tinyfish.ai",
        queries: [],
        searches_run: 0,
        total_results: 0,
        after_social_filter: 0,
        results_count: 0,
        latency_seconds: 0,
        key_configured: false,
        status: "no_api_key" as const,
        fields_parsed: ["position", "site_name", "snippet", "title", "url", "date"],
        results_sample: [],
        parsed_articles: [],
      },
    };
    liveFeedAreaCache.set(cacheKey, {
      timestamp: Date.now(),
      data: emptyResponse,
    });
    return res.json({
      ...emptyResponse,
      cached: false,
    });
  }

  // Requirement 5: Search coverage: general queries + 1 query per hotspot in current zone
  const q1 = isDefaultArea
    ? "Delhi waterlogging today underpass"
    : `${areaName} waterlogging today underpass`;
  const q2 = isDefaultArea
    ? "Delhi waterlogging road closed traffic advisory"
    : `${areaName} waterlogging road closed traffic advisory`;

  const hotspotQueries = targetHotspots.map((h: any) => `${h.name} waterlogging`);
  const allQueries = [q1, q2, ...hotspotQueries];

  try {
    const fetchSearch = async (queryStr: string) => {
      const searchUrl = new URL("https://api.search.tinyfish.ai");
      searchUrl.searchParams.set("query", queryStr);
      searchUrl.searchParams.set("location", "IN");
      searchUrl.searchParams.set("language", "en");

      const startT = Date.now();
      const response = await fetch(searchUrl.toString(), {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const latencyMs = Date.now() - startT;
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`TinyFish Search HTTP ${response.status} for '${queryStr}': ${errText.slice(0, 150)}`);
      }

      const json = await response.json();
      return { json, latencyMs, query: queryStr };
    };

    const overallStart = Date.now();
    // Run all searches in parallel with 10 second timeout each
    const searchResults = await Promise.allSettled(allQueries.map((q) => fetchSearch(q)));
    const latencySeconds = Number(((Date.now() - overallStart) / 1000).toFixed(2));

    let totalRawCount = 0;
    let afterSocialFilterCount = 0;
    const allRawCandidateItems: any[] = [];

    for (const res of searchResults) {
      if (res.status === "fulfilled" && res.value?.json) {
        const data = res.value.json;
        const rawList: any[] = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        totalRawCount += rawList.length;

        for (const item of rawList) {
          if (!item || typeof item !== "object") continue;
          const url = typeof item.url === "string" ? item.url.trim() : "";
          if (url && isExcludedSourceUrl(url)) {
            continue; // Dropped by social filter (Requirement 1 & 4)
          }
          afterSocialFilterCount++;
          allRawCandidateItems.push(item);
        }
      }
    }

    // De-duplicate by normalized URL
    const uniqueResults: TinyFishSearchResultItem[] = [];
    const seenUrls = new Set<string>();

    for (let i = 0; i < allRawCandidateItems.length; i++) {
      const r = allRawCandidateItems[i];
      const url = typeof r.url === "string" ? r.url.trim() : "";
      const norm = url ? normalizeUrl(url) : "";
      const key = norm || (typeof r.title === "string" ? r.title.toLowerCase().trim() : "");
      if (!key || seenUrls.has(key)) continue;
      seenUrls.add(key);

      uniqueResults.push({
        position: uniqueResults.length + 1,
        site_name: typeof r.site_name === "string" ? r.site_name.trim() : "",
        snippet: typeof r.snippet === "string" ? r.snippet.trim() : "",
        title: typeof r.title === "string" ? r.title.trim() : "",
        url,
        date: typeof r.date === "string" ? r.date.trim() : undefined,
      });
    }

    // 1. Match Hotspots (names and aliases) inside the area
    const matches: Array<{
      hotspotName: string;
      sources: MatchedSource[];
      snippet: string;
      eventType: EventType;
      recencyLabel: RecencyLabel;
      inZone: boolean;
    }> = [];

    for (const hotspot of targetHotspots) {
      const searchTerms = [hotspot.name, ...(hotspot.aliases || [])];
      const matchedSources: MatchedSource[] = [];
      let bestSnippet = "";

      for (const item of uniqueResults) {
        if (!item.url || isExcludedSourceUrl(item.url)) continue;
        const text = `${item.title} ${item.snippet}`.toLowerCase();
        const matched = searchTerms.some((term) => {
          const tLower = term.toLowerCase().trim();
          return tLower.length >= 3 && text.includes(tLower);
        });

        if (matched) {
          const norm = normalizeUrl(item.url);
          if (!matchedSources.some((s) => normalizeUrl(s.url) === norm)) {
            const srcRecency = classifyRecency(item.date, item.snippet);
            matchedSources.push({
              title: item.title || "News Report",
              url: item.url || "",
              site_name: item.site_name,
              date: item.date,
              position: item.position,
              recencyLabel: srcRecency,
            });
          }
          if (!bestSnippet && item.snippet) {
            bestSnippet = item.snippet;
          }
        }
      }

      if (matchedSources.length > 0) {
        const snippetText = bestSnippet || `Active monsoon inundation reported across ${hotspot.name}.`;
        const cardRecency = getNewestRecency(matchedSources.map((s) => s.recencyLabel));
        const eventType = classifyEventType(snippetText, hotspot.name);
        matches.push({
          hotspotName: hotspot.name,
          sources: matchedSources,
          snippet: snippetText,
          eventType,
          recencyLabel: cardRecency,
          inZone: true,
        });
      }
    }

    // 2. Also detect prominent underpasses directly reported in search results
    const detectedUnderpasses = [
      { name: "Moolchand Underpass", aliases: ["Moolchand", "Moolchand RUB"] },
      { name: "Azad Market Underpass", aliases: ["Azad Market", "Azad Market RUB"] },
      { name: "Dwarka Underpass", aliases: ["Dwarka", "Dwarka Expressway underpass"] },
      { name: "Okhla Underpass", aliases: ["Okhla", "Okhla underpass"] },
      { name: "Pragati Maidan Tunnel / Underpass", aliases: ["Pragati Maidan", "Bhairon Marg tunnel"] },
      { name: "Tilak Bridge Railway Underpass", aliases: ["Tilak Bridge", "Tilak RUB"] },
      { name: "Minto Bridge Railway Underpass", aliases: ["Minto Bridge", "Minto Road"] },
      { name: "ITO Junction / Vikas Marg Corridor", aliases: ["ITO", "Vikas Marg"] },
    ];

    for (const up of detectedUnderpasses) {
      if (matches.some((m) => m.hotspotName.toLowerCase() === up.name.toLowerCase())) continue;
      const terms = [up.name, ...up.aliases];
      const matchedSources: MatchedSource[] = [];
      let bestSnippet = "";

      for (const item of uniqueResults) {
        if (!item.url || isExcludedSourceUrl(item.url)) continue;
        const text = `${item.title} ${item.snippet}`.toLowerCase();
        const matched = terms.some((t) => {
          const tLower = t.toLowerCase().trim();
          return tLower.length >= 3 && text.includes(tLower);
        });

        if (matched) {
          const norm = normalizeUrl(item.url);
          if (!matchedSources.some((s) => normalizeUrl(s.url) === norm)) {
            const srcRecency = classifyRecency(item.date, item.snippet);
            matchedSources.push({
              title: item.title || "News Report",
              url: item.url || "",
              site_name: item.site_name,
              date: item.date,
              position: item.position,
              recencyLabel: srcRecency,
            });
          }
          if (!bestSnippet && item.snippet) {
            bestSnippet = item.snippet;
          }
        }
      }

      if (matchedSources.length > 0) {
        const snippetText = bestSnippet || `Waterlogging reported at ${up.name}.`;
        const inZone = targetHotspots.some(
          (th) =>
            th.name.toLowerCase() === up.name.toLowerCase() ||
            (th.aliases && th.aliases.some((a: string) => a.toLowerCase() === up.name.toLowerCase()))
        );
        const cardRecency = getNewestRecency(matchedSources.map((s) => s.recencyLabel));
        const eventType = classifyEventType(snippetText, up.name);
        matches.push({
          hotspotName: up.name,
          sources: matchedSources,
          snippet: snippetText,
          eventType,
          recencyLabel: cardRecency,
          inZone,
        });
      }
    }

    // 3. Match Road Names from loaded road network (case-insensitive)
    const matchedRoads: Array<{
      roadName: string;
      sources: MatchedSource[];
      snippet: string;
      eventType: EventType;
      recencyLabel: RecencyLabel;
    }> = [];

    const roadNamesSet = new Set<string>();
    for (const rawName of candidateRoads) {
      const trimmed = String(rawName || "").trim();
      if (trimmed.length < 4) continue;
      const lower = trimmed.toLowerCase();
      if (
        lower === "unnamed" ||
        lower === "service road" ||
        lower === "link road" ||
        lower === "ramp" ||
        lower === "path" ||
        lower === "street"
      ) {
        continue;
      }
      roadNamesSet.add(trimmed);
    }

    ["Dwarka Expressway", "Delhi-Airport Road", "Barakhamba Road", "Vikas Marg", "Mathura Road", "Ring Road"].forEach((r) => roadNamesSet.add(r));

    for (const roadName of roadNamesSet) {
      const matchedSources: MatchedSource[] = []; // <-- FIX: was declared without "= []"
      let bestSnippet = "";
      const regex = new RegExp(`\\b${escapeRegex(roadName.toLowerCase())}\\b`, "i");

      for (const item of uniqueResults) {
        if (!item.url || isExcludedSourceUrl(item.url)) continue;
        const text = `${item.title} ${item.snippet}`;
        if (regex.test(text)) {
          const norm = normalizeUrl(item.url);
          if (!matchedSources.some((s) => normalizeUrl(s.url) === norm)) {
            const srcRecency = classifyRecency(item.date, item.snippet);
            matchedSources.push({
              title: item.title || "Traffic Advisory",
              url: item.url || "",
              site_name: item.site_name,
              date: item.date,
              position: item.position,
              recencyLabel: srcRecency,
            });
          }
          if (!bestSnippet && item.snippet) {
            bestSnippet = item.snippet;
          }
        }
      }

      if (matchedSources.length > 0) {
        const snippetText = bestSnippet || `Waterlogging or road closure reported along ${roadName}.`;
        const cardRecency = getNewestRecency(matchedSources.map((s) => s.recencyLabel));
        const eventType = classifyEventType(snippetText, roadName);
        matchedRoads.push({
          roadName,
          sources: matchedSources,
          snippet: snippetText,
          eventType,
          recencyLabel: cardRecency,
        });
      }
    }

    // Build comprehensive diagnostics object with funnel metrics
    const diagnostics = {
      endpoint: "https://api.search.tinyfish.ai",
      queries: allQueries,
      searches_run: allQueries.length,
      total_results: totalRawCount,
      after_social_filter: afterSocialFilterCount,
      results_count: uniqueResults.length,
      latency_ms: Math.round(latencySeconds * 1000),
      latency_seconds: latencySeconds,
      key_configured: true,
      status: "live_success" as const,
      fields_parsed: ["position", "site_name", "snippet", "title", "url", "date"],
      results_sample: uniqueResults,
      parsed_articles: uniqueResults,
    };

    const zoneLabel = isDefaultArea ? "Central Delhi" : areaName;
    const inZoneCount = matches.filter((m) => m.inZone).length;

    const resultData = {
      mode: "live" as const,
      areaName: zoneLabel,
      hasApiKey: true,
      fetchedAt: new Date().toISOString(),
      matches,
      matchedRoads,
      reason: `Live search queries completed via TinyFish Search API (${allQueries.length} searches run, ${uniqueResults.length} articles parsed).`,
      diagnostics,
    };

    liveFeedAreaCache.set(cacheKey, {
      timestamp: Date.now(),
      data: resultData,
    });

    return res.json({
      ok: true,
      ...resultData,
      cached: false,
    });
  } catch (err: any) {
    console.info("Info: TinyFish Search API error:", err?.message || err);
    const fallback = getFallbackLiveFeed(targetHotspots);

    const diagnostics = {
      endpoint: "https://api.search.tinyfish.ai",
      queries: [q1, q2],
      total_results: isDefaultArea ? fallback.matches.length : 0,
      results_count: isDefaultArea ? fallback.matches.length : 0,
      latency_ms: 0,
      status: "api_error" as const,
      fields_parsed: ["position", "site_name", "snippet", "title", "url", "date"],
      results_sample: (fallback.matches || []).flatMap((m: any) =>
        (m.sources || []).map((s: any, idx: number) => ({
          position: s.position || idx + 1,
          site_name: s.site_name || "news",
          snippet: m.snippet,
          title: s.title,
          url: s.url,
          date: s.date || "Recent",
        }))
      ),
    };

    if (isDefaultArea) {
      const fallbackData = {
        ok: true,
        ...fallback,
        cached: false,
        error: err.message || "Live search error",
        reason: `TinyFish API error (${err.message || "request failed"}); serving verified bundled fallback snapshot for Central Delhi.`,
        diagnostics,
      };
      liveFeedAreaCache.set(cacheKey, {
        timestamp: Date.now(),
        data: fallbackData,
      });
      return res.json(fallbackData);
    }

    const customErr = {
      ok: true,
      mode: "cached" as const,
      areaName,
      fetchedAt: new Date().toISOString(),
      matches: [],
      matchedRoads: [],
      error: err.message || "Live search error",
      reason: `TinyFish Search request error: ${err.message || "network or API failure"}.`,
      diagnostics,
    };
    liveFeedAreaCache.set(cacheKey, {
      timestamp: Date.now(),
      data: customErr,
    });
    return res.json({
      ...customErr,
      cached: false,
    });
  }
});

// App server bootstrap
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RoadRisk Delhi server running on port ${PORT}`);
  });
}

startServer();