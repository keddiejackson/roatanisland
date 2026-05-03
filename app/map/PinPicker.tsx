"use client";

import { roatanCenter } from "@/lib/map";

type PinPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
};

const zoom = 12;

function latLonToWorld(latitude: number, longitude: number) {
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

function worldToLatLon(x: number, y: number) {
  const scale = 256 * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude =
    (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { latitude, longitude };
}

function getTiles() {
  const centerWorld = latLonToWorld(roatanCenter.latitude, roatanCenter.longitude);
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

export default function PinPicker({ latitude, longitude, onChange }: PinPickerProps) {
  const centerWorld = latLonToWorld(roatanCenter.latitude, roatanCenter.longitude);
  const currentLatitude = latitude ? Number(latitude) : roatanCenter.latitude;
  const currentLongitude = longitude ? Number(longitude) : roatanCenter.longitude;
  const markerWorld = latLonToWorld(currentLatitude, currentLongitude);

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = centerWorld.x + event.clientX - rect.left - rect.width / 2;
        const y = centerWorld.y + event.clientY - rect.top - rect.height / 2;
        const coords = worldToLatLon(x, y);
        onChange({
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        });
      }}
      className="relative h-56 w-full overflow-hidden rounded-xl bg-[#98D1CA] text-left shadow-inner"
    >
      {getTiles().map((tile) => (
        <span
          key={`${tile.x}-${tile.y}`}
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
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#0B3C5D]">
        Click map to move pin
      </span>
    </button>
  );
}
