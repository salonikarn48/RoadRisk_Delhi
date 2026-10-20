// Prototype road-capacity assumptions based on OSM highway classes
export const ROAD_CAPACITY = {
  motorway: 2000,
  motorway_link: 1600,
  trunk: 1800,
  trunk_link: 1500,
  primary: 1500,
  primary_link: 1200,
  secondary: 1000,
  secondary_link: 800,
  tertiary: 700,
  tertiary_link: 600,
  unclassified: 500,
  residential: 400,
  service: 200,
};

export function getRoadCapacity(highway) {
  return ROAD_CAPACITY[highway] || 500;
}
