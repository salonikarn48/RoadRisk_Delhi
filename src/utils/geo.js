// Geographic helper functions
const EARTH_RADIUS_KM = 6371;

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function distanceKm(pointA, pointB) {
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function distanceMeters(pointA, pointB) {
  return distanceKm(pointA, pointB) * 1000;
}

export function midpoint(pointA, pointB) {
  return {
    lat: (pointA.lat + pointB.lat) / 2,
    lon: (pointA.lon + pointB.lon) / 2,
  };
}

export function calculateCenter(points) {
  if (!points || points.length === 0) return null;
  let totalLat = 0;
  let totalLon = 0;
  for (const point of points) {
    totalLat += Number(point.lat);
    totalLon += Number(point.lon);
  }
  return {
    lat: totalLat / points.length,
    lon: totalLon / points.length,
  };
}

export function getBoundingBox(points) {
  if (!points || points.length === 0) return null;
  let minLat = Number(points[0].lat);
  let maxLat = Number(points[0].lat);
  let minLon = Number(points[0].lon);
  let maxLon = Number(points[0].lon);

  for (const point of points) {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return { minLat, maxLat, minLon, maxLon };
}

export function isValidCoordinate(point) {
  if (!point) return false;
  const lat = Number(point.lat);
  const lon = Number(point.lon);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function coordinateKey(lat, lon) {
  return `${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
}

export function normalizeCoordinate(point) {
  if (!point) return null;
  const lat = point.lat ?? point.latitude;
  const lon = point.lon ?? point.lng ?? point.longitude;
  if (lat === undefined || lon === undefined) return null;
  const normalized = { lat: Number(lat), lon: Number(lon) };
  if (!isValidCoordinate(normalized)) return null;
  return normalized;
}

export function calculateAreaKm2(bounds) {
  if (!bounds || bounds.length !== 2) return 0;
  const south = Math.min(bounds[0][0], bounds[1][0]);
  const north = Math.max(bounds[0][0], bounds[1][0]);
  const west = Math.min(bounds[0][1], bounds[1][1]);
  const east = Math.max(bounds[0][1], bounds[1][1]);

  const latDeltaKm = Math.abs(north - south) * 111.0;
  const midLatRad = toRadians((north + south) / 2);
  const lonDeltaKm = Math.abs(east - west) * 111.0 * Math.cos(midLatRad);
  return Number((latDeltaKm * lonDeltaKm).toFixed(2));
}

