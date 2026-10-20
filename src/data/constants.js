// Project-wide constants
export const NETWORK_CONFIG = {
  MAX_OD_NODES: 15,
  TOP_CRITICAL_ROADS: 5,
  TOP_LOADED_ROADS: 5,
};

export const TRAFFIC_CONFIG = {
  MIN_DEMAND: 50,
  MAX_DEMAND: 200,
  NORMAL_LIMIT: 60,
  MODERATE_LIMIT: 80,
  HEAVY_LIMIT: 100,
};

export const FAILURE_CONFIG = {
  OVERLOAD_THRESHOLD: 100,
  CONGESTION_THRESHOLD: 80,
  MAX_ANALYSIS_ROADS: 16,
};

export const RESILIENCE_CONFIG = {
  TRAVEL_WEIGHT: 0.7,
  DISCONNECTED_WEIGHT: 0.3,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
};

export const MAP_CONFIG = {
  DEFAULT_ZOOM: 14,
  MAX_ZOOM: 19,
  MIN_ZOOM: 3,
};

export const ROAD_COLORS = {
  NORMAL: "#10b981",
  MODERATE: "#fbbf24",
  HEAVY: "#fb923c",
  CRITICAL: "#f43f5e",
  FAILED: "#f43f5e",
  DEFAULT: "#475569",
};

// Average urban travel speeds in km/h based on OpenStreetMap highway classes
// (Documented as planning assumption in Model Assumptions)
export const ROAD_SPEEDS_KMH = {
  motorway: 60,
  motorway_link: 50,
  trunk: 50,
  trunk_link: 40,
  primary: 35,
  primary_link: 30,
  secondary: 25,
  secondary_link: 20,
  tertiary: 20,
  tertiary_link: 15,
  unclassified: 15,
  residential: 15,
  service: 10,
  default: 20,
};

// Emergency accessibility thresholds for hospital corridors
export const HOSPITAL_CONFIG = {
  // Golden hour emergency threshold: 8 minutes
  GOLDEN_HOUR_THRESHOLD_MINUTES: 8,
  // Moderate accessibility threshold: 15 minutes
  MODERATE_THRESHOLD_MINUTES: 15,
};

// Prioritization scoring weights and limits for fix recommendations
// Default weights are 50% connectivity and 50% hospital access, adjustable by the planner slider
export const PRIORITIZATION_CONFIG = {
  CONNECTIVITY_WEIGHT: 0.5, // 50% weight on recovering disconnected trip demand
  HOSPITAL_ACCESS_WEIGHT: 0.5, // 50% weight on restoring 8-minute hospital access
  MAX_PAIR_EVALUATION_COUNT: 10, // Evaluate all pairs if active hotspots <= 10
};

export const APP_CONFIG = {
  NAME: "RoadRisk - Delhi Pre-Monsoon Risk Screening & Road Network Prioritization",
  VERSION: "2.5.0",
  DESCRIPTION:
    "Pre-monsoon risk screening and prioritization tool for MCD/PWD to identify which waterlogging hotspot, if fixed first, protects the road network and hospital access.",
};
