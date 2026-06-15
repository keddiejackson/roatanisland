"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { roatanCenter } from "@/lib/map";

type PinPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
};

const zoomLevels = [11, 12, 13, 14, 15, 16, 17, 18];
const minZoom = zoomLevels[0];
const maxZoom = zoomLevels[zoomLevels.length - 1];

function asCoordinate(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function latLonToWorld(latitude: number, longitude: number, zoom: number) {
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

function worldToLatLon(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude =
    (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { latitude, longitude };
}

function getTiles(
  center: { latitude: number; longitude: number },
  zoom: number,
) {
  const centerWorld = latLonToWorld(center.latitude, center.longitude, zoom);
  const centerTileX = Math.floor(centerWorld.x / 256);
  const centerTileY = Math.floor(centerWorld.y / 256);
  const tiles: { x: number; y: number; left: number; top: number }[] = [];

  for (let x = centerTileX - 2; x <= centerTileX + 2; x += 1) {
    for (let y = centerTileY - 2; y <= centerTileY + 2; y += 1) {
      tiles.push({
        x,
        y,
        left: x * 256 - centerWorld.x,
        top: y * 256 - centerWorld.y,
      });
    }
  }

  return tiles;
}

function nextZoomLevel(currentZoom: number, direction: 1 | -1) {
  if (currentZoom <= minZoom && direction < 0) return minZoom;
  if (currentZoom >= maxZoom && direction > 0) return maxZoom;

  const currentIndex = zoomLevels.indexOf(currentZoom);
  const nextIndex = Math.min(
    Math.max((currentIndex >= 0 ? currentIndex : 1) + direction, 0),
    zoomLevels.length - 1,
  );

  return zoomLevels[nextIndex];
}

export default function PinPicker({
  latitude,
  longitude,
  onChange,
}: PinPickerProps) {
  const currentLatitude = asCoordinate(latitude, roatanCenter.latitude);
  const currentLongitude = asCoordinate(longitude, roatanCenter.longitude);
  const [zoom, setZoom] = useState(latitude && longitude ? 15 : 12);
  const [manualCenter, setManualCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const centerLatitude = manualCenter?.latitude ?? currentLatitude;
  const centerLongitude = manualCenter?.longitude ?? currentLongitude;

  const centerWorld = latLonToWorld(centerLatitude, centerLongitude, zoom);
  const markerWorld = latLonToWorld(currentLatitude, currentLongitude, zoom);
  const tiles = useMemo(
    () => getTiles({ latitude: centerLatitude, longitude: centerLongitude }, zoom),
    [centerLatitude, centerLongitude, zoom],
  );

  function setPin(coords: { latitude: number; longitude: number }) {
    setManualCenter(coords);
    onChange({
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    });
  }

  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = centerWorld.x + event.clientX - rect.left - rect.width / 2;
    const y = centerWorld.y + event.clientY - rect.top - rect.height / 2;
    setPin(worldToLatLon(x, y, zoom));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#00A8A8]/20 bg-white shadow-sm">
      <div
        role="application"
        aria-label="Precision map pin picker"
        onClick={handleMapClick}
        onWheel={(event) => {
          event.preventDefault();
          setZoom((currentZoom) =>
            nextZoomLevel(currentZoom, event.deltaY < 0 ? 1 : -1),
          );
        }}
        className="relative h-72 w-full cursor-crosshair overflow-hidden bg-[#98D1CA] text-left shadow-inner"
      >
        {tiles.map((tile) => (
          <span
            key={`${zoom}-${tile.x}-${tile.y}`}
            style={{
              left: `calc(50% + ${tile.left}px)`,
              top: `calc(50% + ${tile.top}px)`,
              backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png)`,
            }}
            className="absolute h-64 w-64 bg-cover"
          />
        ))}
        <span
          style={{
            left: `calc(50% + ${markerWorld.x - centerWorld.x}px)`,
            top: `calc(50% + ${markerWorld.y - centerWorld.y}px)`,
          }}
          className="absolute z-10 -translate-x-1/2 -translate-y-full rounded-full bg-[#00A8A8] px-3 py-2 text-xs font-bold text-white shadow-lg ring-4 ring-white/80"
        >
          Pin
        </span>
        <div className="absolute left-3 top-3 z-20 grid gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setZoom((currentZoom) => nextZoomLevel(currentZoom, 1));
            }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl font-black text-[#0B3C5D] shadow"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setZoom((currentZoom) => nextZoomLevel(currentZoom, -1));
            }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl font-black text-[#0B3C5D] shadow"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setManualCenter({
                latitude: currentLatitude,
                longitude: currentLongitude,
              });
              setZoom(maxZoom);
            }}
            className="rounded-xl bg-[#071F2F] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow"
          >
            Exact
          </button>
        </div>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#0B3C5D] shadow">
          Zoom {zoom}/{maxZoom}
        </span>
      </div>
      <div className="grid gap-2 border-t border-[#00A8A8]/15 bg-[#EEF7F6] p-3 text-xs font-semibold text-[#0B3C5D] sm:flex sm:items-center sm:justify-between">
        <span>Tap the map to place the exact guest meeting point.</span>
        <span>
          {currentLatitude.toFixed(6)}, {currentLongitude.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
