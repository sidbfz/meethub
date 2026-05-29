// src/components/events/event-map.tsx
"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Webpack/Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/images/marker-icon-2x.png',
  iconUrl: 'leaflet/images/marker-icon.png',
  shadowUrl: 'leaflet/images/marker-shadow.png',
});

interface EventMapProps {
  lat: number;
  lng: number;
  venueName?: string;
  address?: string;
}

export function EventMap({ lat, lng, venueName, address }: EventMapProps) {
  const position: [number, number] = [lat, lng];

  if (lat === 0 && lng === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
        Map not available for online events.
      </div>
    );
  }

  return (
    <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          {venueName && <strong>{venueName}</strong>}
          {address && <p>{address}</p>}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
