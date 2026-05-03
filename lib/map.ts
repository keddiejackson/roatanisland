export const roatanCenter = { latitude: 16.34, longitude: -86.48 };

export const areaPositions: Record<string, { latitude: number; longitude: number }> = {
  "west bay": { latitude: 16.274, longitude: -86.599 },
  "west end": { latitude: 16.305, longitude: -86.594 },
  sandy: { latitude: 16.329, longitude: -86.564 },
  "sandy bay": { latitude: 16.329, longitude: -86.564 },
  coxen: { latitude: 16.317, longitude: -86.536 },
  "coxen hole": { latitude: 16.317, longitude: -86.536 },
  flower: { latitude: 16.343, longitude: -86.515 },
  "flower bay": { latitude: 16.343, longitude: -86.515 },
  french: { latitude: 16.354, longitude: -86.455 },
  "french harbour": { latitude: 16.354, longitude: -86.455 },
  "french harbor": { latitude: 16.354, longitude: -86.455 },
  "first bight": { latitude: 16.371, longitude: -86.426 },
  "second bight": { latitude: 16.381, longitude: -86.397 },
  "parrot tree": { latitude: 16.369, longitude: -86.413 },
  "oak ridge": { latitude: 16.404, longitude: -86.346 },
  camp: { latitude: 16.413, longitude: -86.332 },
  "camp bay": { latitude: 16.413, longitude: -86.332 },
  "punta gorda": { latitude: 16.402, longitude: -86.377 },
  roatan: roatanCenter,
};

export function findAreaPosition(location: string | null | undefined) {
  const normalized = (location || "roatan").toLowerCase();
  const match = Object.entries(areaPositions).find(([area]) =>
    normalized.includes(area),
  );

  return match?.[1] || roatanCenter;
}

export function formatCoordinate(value: number) {
  return Number(value.toFixed(6));
}

export function googleMapsUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  title?: string | null;
}) {
  if (input.latitude !== null && input.latitude !== undefined && input.longitude !== null && input.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${input.title || ""} ${input.location || "Roatan"}`.trim(),
  )}`;
}

export function googleDirectionsUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  title?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
}) {
  const destination =
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined
      ? `${input.latitude},${input.longitude}`
      : `${input.title || ""} ${input.location || "Roatan"}`.trim();
  const origin =
    input.originLatitude !== null &&
    input.originLatitude !== undefined &&
    input.originLongitude !== null &&
    input.originLongitude !== undefined
      ? `&origin=${input.originLatitude},${input.originLongitude}`
      : "";

  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${encodeURIComponent(destination)}`;
}

export function appleMapsUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  title?: string | null;
}) {
  if (input.latitude !== null && input.latitude !== undefined && input.longitude !== null && input.longitude !== undefined) {
    return `https://maps.apple.com/?ll=${input.latitude},${input.longitude}&q=${encodeURIComponent(input.title || "Roatan listing")}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(
    `${input.title || ""} ${input.location || "Roatan"}`.trim(),
  )}`;
}

export function appleDirectionsUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  title?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
}) {
  const destination =
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined
      ? `${input.latitude},${input.longitude}`
      : `${input.title || ""} ${input.location || "Roatan"}`.trim();
  const origin =
    input.originLatitude !== null &&
    input.originLatitude !== undefined &&
    input.originLongitude !== null &&
    input.originLongitude !== undefined
      ? `&sll=${input.originLatitude},${input.originLongitude}`
      : "";

  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}${origin}`;
}

export function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const radiusMiles = 3958.8;
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const firstLatitude = (a.latitude * Math.PI) / 180;
  const secondLatitude = (b.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return radiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
