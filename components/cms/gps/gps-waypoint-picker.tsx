"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Circle, Marker } from "leaflet";
import { GridButton, GridInput, GridLabel } from "@/components/grid/grid-shell";
import {
  DEFAULT_GPS_RADIUS_METERS,
  type GpsPin,
} from "@/lib/cms/gps-defaults";

type Props = {
  value: GpsPin | null;
  defaultCenter: GpsPin;
  onChange: (pin: GpsPin) => void;
  disabled?: boolean;
};

export function GpsWaypointPicker({ value, defaultCenter, onChange, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pin = value ?? defaultCenter;
  const pinRef = useRef(pin);
  pinRef.current = pin;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      const start = pinRef.current;
      map.setView([start.lat, start.lng], 16);

      const marker = L.marker([start.lat, start.lng], { draggable: !disabled }).addTo(map);
      markerRef.current = marker;

      const circle = L.circle([start.lat, start.lng], {
        radius: start.radius_meters,
        color: "#2ee9da",
        weight: 2,
        fillColor: "#2ee9da",
        fillOpacity: 0.2,
      }).addTo(map);
      circleRef.current = circle;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const current = pinRef.current;
        onChangeRef.current({ ...current, lat: pos.lat, lng: pos.lng });
      });

      mapRef.current = map;
    }

    void init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [disabled]);

  useEffect(() => {
    const marker = markerRef.current;
    const circle = circleRef.current;
    const map = mapRef.current;
    if (!marker || !circle || !map) return;

    marker.setLatLng([pin.lat, pin.lng]);
    circle.setLatLng([pin.lat, pin.lng]);
    circle.setRadius(pin.radius_meters);
    if (marker.dragging) {
      marker.dragging[disabled ? "disable" : "enable"]();
    }
  }, [pin.lat, pin.lng, pin.radius_meters, disabled]);

  const patch = useCallback(
    (partial: Partial<GpsPin>) => {
      onChange({ ...pin, ...partial });
    },
    [onChange, pin],
  );

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onChange({
        ...pin,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--grid-border)]">
        <div ref={containerRef} className="h-[220px] w-full sm:h-[260px]" />
      </div>
      <p className="text-xs text-[var(--grid-muted)]">
        Marker ziehen oder Koordinaten eingeben — der türkise Kreis zeigt den Aktivierungs-Radius.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <GridLabel>Latitude</GridLabel>
          <GridInput
            type="number"
            step="any"
            disabled={disabled}
            value={pin.lat}
            onChange={(e) => patch({ lat: Number(e.target.value) })}
          />
        </div>
        <div>
          <GridLabel>Longitude</GridLabel>
          <GridInput
            type="number"
            step="any"
            disabled={disabled}
            value={pin.lng}
            onChange={(e) => patch({ lng: Number(e.target.value) })}
          />
        </div>
        <div>
          <GridLabel>Radius (Meter)</GridLabel>
          <GridInput
            type="number"
            min={5}
            max={500}
            disabled={disabled}
            value={pin.radius_meters}
            onChange={(e) =>
              patch({
                radius_meters: Math.max(5, Number(e.target.value) || DEFAULT_GPS_RADIUS_METERS),
              })
            }
          />
        </div>
      </div>
      <GridButton
        type="button"
        disabled={disabled}
        className="w-auto px-4 py-2 text-sm"
        onClick={useMyLocation}
      >
        Meine Position
      </GridButton>
    </div>
  );
}
