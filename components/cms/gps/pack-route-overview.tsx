"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker, Polyline } from "leaflet";
import { updateLayer1ItemGps } from "@/app/actions/cms/packs";
import { IconChevronDown, IconMapPin } from "@/components/cms/studio-icons";
import { defaultMapCenter, type GpsPin } from "@/lib/cms/gps-defaults";
import { parsePackItemOverrides, type StudioLayerPackItem } from "@/lib/cms/layer-packs";

type RouteStop = {
  itemId: string;
  index: number;
  title: string;
  pin: GpsPin;
};

type Props = {
  packId: string;
  citySlug?: string | null;
  items: StudioLayerPackItem[];
  disabled?: boolean;
  onSaved: (items: StudioLayerPackItem[]) => void;
  onError: (message: string | null) => void;
};

function collectStops(items: StudioLayerPackItem[]): RouteStop[] {
  return items.flatMap((item, index) => {
    const pin = parsePackItemOverrides(item.overrides).gps;
    if (!pin) return [];
    return [{ itemId: item.id, index: index + 1, title: item.task.title, pin }];
  });
}

function markerHtml(index: number): string {
  return `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#0f766e;color:#fff;font:700 12px/1 system-ui,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.28)">${index}</div>`;
}

export function PackRouteOverview({
  packId,
  citySlug,
  items,
  disabled,
  onSaved,
  onError,
}: Props) {
  const stops = useMemo(() => collectStops(items), [items]);
  const missing = items.length - stops.length;
  const [open, setOpen] = useState(stops.length > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const circlesRef = useRef(new Map<string, Circle>());
  const lineRef = useRef<Polyline | null>(null);
  const timersRef = useRef(new Map<string, number>());
  const itemsRef = useRef(items);
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);
  itemsRef.current = items;
  onSavedRef.current = onSaved;
  onErrorRef.current = onError;

  function persist(itemId: string, pin: GpsPin) {
    const previous = timersRef.current.get(itemId);
    if (previous) window.clearTimeout(previous);
    const nextItems = itemsRef.current.map((item) =>
      item.id === itemId
        ? { ...item, overrides: { ...item.overrides, gps: pin, location: pin } }
        : item,
    );
    itemsRef.current = nextItems;
    onSavedRef.current(nextItems);
    timersRef.current.set(
      itemId,
      window.setTimeout(() => {
        void updateLayer1ItemGps(packId, itemId, pin).then((result) => {
          if (!result.success) {
            onErrorRef.current(result.error);
            return;
          }
          onErrorRef.current(null);
          if (result.data) {
            itemsRef.current = result.data;
            onSavedRef.current(result.data);
          }
        });
      }, 280),
    );
  }

  useEffect(() => {
    if (!open) return undefined;
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
      mapRef.current = map;
      syncMarkers(L);
      window.setTimeout(() => {
        map.invalidateSize();
        fitToStops(map);
      }, 40);
    }

    void init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      circlesRef.current.clear();
      lineRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open || !mapRef.current) return;
    void import("leaflet").then((mod) => {
      const L = mod.default;
      syncMarkers(L);
    });
  }, [open, stops, disabled]);

  function fitToStops(map: LeafletMap) {
    if (stops.length === 0) {
      const fallback = defaultMapCenter(citySlug);
      map.setView([fallback.lat, fallback.lng], 13);
      return;
    }
    if (stops.length === 1) {
      map.setView([stops[0]!.pin.lat, stops[0]!.pin.lng], 16);
      return;
    }
    map.fitBounds(
      stops.map((stop) => [stop.pin.lat, stop.pin.lng] as [number, number]),
      { padding: [28, 28], maxZoom: 17 },
    );
  }

  function syncMarkers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();

    for (const stop of stops) {
      seen.add(stop.itemId);
      const latLng: [number, number] = [stop.pin.lat, stop.pin.lng];
      let marker = markersRef.current.get(stop.itemId);
      let circle = circlesRef.current.get(stop.itemId);
      const icon = L.divIcon({
        className: "pack-route-marker",
        html: markerHtml(stop.index),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!marker) {
        marker = L.marker(latLng, { icon, draggable: !disabled }).addTo(map);
        marker.bindTooltip(`${stop.index}. ${stop.title}`, { direction: "top", offset: [0, -12] });
        marker.on("drag", () => {
          const pos = marker!.getLatLng();
          circlesRef.current.get(stop.itemId)?.setLatLng(pos);
          refreshLine(L);
        });
        marker.on("dragend", () => {
          const pos = marker!.getLatLng();
          const current = collectStops(itemsRef.current).find((row) => row.itemId === stop.itemId);
          persist(stop.itemId, {
            lat: pos.lat,
            lng: pos.lng,
            radius_meters: current?.pin.radius_meters ?? stop.pin.radius_meters,
          });
        });
        markersRef.current.set(stop.itemId, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng(latLng);
        marker.setTooltipContent(`${stop.index}. ${stop.title}`);
        if (marker.dragging) marker.dragging[disabled ? "disable" : "enable"]();
      }

      if (!circle) {
        circle = L.circle(latLng, {
          radius: stop.pin.radius_meters,
          color: "#0f766e",
          weight: 2,
          fillColor: "#0f766e",
          fillOpacity: 0.12,
        }).addTo(map);
        circlesRef.current.set(stop.itemId, circle);
      } else {
        circle.setLatLng(latLng);
        circle.setRadius(stop.pin.radius_meters);
      }
    }

    for (const [itemId, marker] of markersRef.current) {
      if (seen.has(itemId)) continue;
      map.removeLayer(marker);
      markersRef.current.delete(itemId);
      const circle = circlesRef.current.get(itemId);
      if (circle) {
        map.removeLayer(circle);
        circlesRef.current.delete(itemId);
      }
    }

    refreshLine(L);
  }

  function refreshLine(L: typeof import("leaflet")) {
    const map = mapRef.current;
    if (!map) return;
    const points = collectStops(itemsRef.current).map((stop) => {
      const live = markersRef.current.get(stop.itemId)?.getLatLng();
      return [live?.lat ?? stop.pin.lat, live?.lng ?? stop.pin.lng] as [number, number];
    });
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    if (points.length < 2) return;
    lineRef.current = L.polyline(points, {
      color: "#0f766e",
      weight: 2,
      opacity: 0.55,
      dashArray: "6 6",
    }).addTo(map);
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-lg font-bold">
            <IconMapPin size={18} />
            Wegpunkte
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {stops.length === 0
              ? "Noch keine Koordinaten. Sobald Stops einen Punkt haben, siehst du sie hier alle auf einer Karte."
              : `${stops.length} von ${items.length} Stops auf der Karte. Marker ziehen verschiebt den Wegpunkt der Aufgabe.`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-primary">
          {open ? "Zuklappen" : "Öffnen"}
          <IconChevronDown size={16} className={open ? "rotate-180" : ""} />
        </span>
      </button>
      {open ? (
        <div className="mt-4 space-y-3">
          <style>{`.pack-route-marker{background:transparent;border:none}`}</style>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div ref={containerRef} className="h-[320px] w-full sm:h-[420px]" />
          </div>
          {missing > 0 ? (
            <p className="text-xs text-muted-foreground">
              {missing} Stop{missing === 1 ? "" : "s"} ohne Koordinaten — die fehlen auf der Karte,
              bis du sie unten setzt.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Die Nummer am Marker ist die Reihenfolge der Einstiegsaufgaben.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
