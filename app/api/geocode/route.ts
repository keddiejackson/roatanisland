import { NextResponse } from "next/server";
import { findAreaPosition, formatCoordinate } from "@/lib/map";

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q")?.trim();

  if (!rawQuery) {
    return NextResponse.json({ error: "Add a location to search." }, { status: 400 });
  }

  const query = rawQuery.toLowerCase().includes("roatan")
    ? rawQuery
    : `${rawQuery}, Roatan, Honduras`;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "RoatanIsland.life map coordinate lookup",
          "Accept-Language": "en",
        },
      },
    );

    if (response.ok) {
      const results = (await response.json()) as NominatimResult[];
      const result = results[0];
      const latitude = result?.lat ? Number(result.lat) : null;
      const longitude = result?.lon ? Number(result.lon) : null;

      if (latitude !== null && longitude !== null) {
        return NextResponse.json({
          latitude: formatCoordinate(latitude),
          longitude: formatCoordinate(longitude),
          label: result.display_name || query,
          source: "lookup",
        });
      }
    }
  } catch {
    // Fall back to known Roatan areas below.
  }

  const fallback = findAreaPosition(rawQuery);
  return NextResponse.json({
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    label: rawQuery,
    source: "area",
  });
}
