import type { Event, LatLng } from '@sidequest/api';
// Metro warns about the image URLs inside; they're for default icons and controls this map doesn't use.
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

type EventMapProps = {
  center: LatLng;
  radiusKm: number;
  events: Event[];
  onSelect: (event: Event) => void;
  /** What the dot in the middle is, e.g. "You are here". */
  centerLabel: string;
  /** Tapping (or clicking) the map elsewhere moves the search there. */
  onMove?: (position: LatLng) => void;
};

type LoadedMap = {
  L: typeof import('leaflet');
  map: import('leaflet').Map;
  markers: import('leaflet').LayerGroup;
  /** Where the viewer is and how far the search reaches. */
  area: import('leaflet').LayerGroup;
};

/**
 * Events with a location as markers on an OpenStreetMap map (Leaflet), around the viewer's
 * position and the search radius. Clicking a marker selects its event; clicking elsewhere can
 * move the search (`onMove`).
 */
export function EventMap({
  center,
  radiusKm,
  events,
  onSelect,
  centerLabel,
  onMove,
}: EventMapProps) {
  const theme = useTheme();
  const shape = useShape();
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: LoadedMap | null = null;
    // Leaflet touches `window` when imported, so it loads in the browser only.
    import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      const map = L.map(container.current);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // The viewer and the radius get a pane under the markers' (overlayPane, z-index 400), so
      // an event right next to you is never hidden under the "you are here" dot.
      map.createPane(AREA_PANE).style.zIndex = '350';
      created = { L, map, area: L.layerGroup().addTo(map), markers: L.layerGroup().addTo(map) };
      setLoaded(created);
    });
    return () => {
      cancelled = true;
      created?.map.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const { L, map, area } = loaded;
    // Exactly the searched area, whatever the map's size. Set before drawing: a new map has no
    // view yet, and Leaflet can't measure shapes on it until it has one.
    const position = L.latLng(center.lat, center.lng);
    map.fitBounds(position.toBounds(radiusKm * 2000), { padding: [8, 8] });
    area.clearLayers();
    L.circle(position, {
      radius: radiusKm * 1000,
      color: theme.tint,
      weight: 1.5,
      fillColor: theme.tint,
      fillOpacity: 0.08,
      interactive: false,
      pane: AREA_PANE,
    }).addTo(area);
    L.circleMarker(position, {
      radius: 7,
      color: theme.background,
      weight: 3,
      fillColor: theme.text,
      fillOpacity: 1,
      pane: AREA_PANE,
    })
      .bindTooltip(centerLabel)
      .addTo(area);
  }, [loaded, center.lat, center.lng, radiusKm, theme, centerLabel]);

  useEffect(() => {
    if (!loaded || !onMove) return;
    const { map } = loaded;
    const move = (event: import('leaflet').LeafletMouseEvent) =>
      onMove({ lat: event.latlng.lat, lng: event.latlng.lng });
    map.on('click', move);
    // A pointer rather than Leaflet's hand, since a click does something.
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.off('click', move);
      map.getContainer().style.cursor = '';
    };
  }, [loaded, onMove]);

  useEffect(() => {
    if (!loaded) return;
    const { L, markers } = loaded;
    markers.clearLayers();
    for (const event of events) {
      if (!event.location) continue;
      L.circleMarker([event.location.lat, event.location.lng], {
        radius: 9,
        color: theme.background,
        weight: 2,
        fillColor: theme.tint,
        fillOpacity: 1,
      })
        .bindTooltip(event.title)
        .on('click', () => onSelect(event))
        .addTo(markers);
    }
  }, [loaded, events, theme, onSelect]);

  // Leaflet draws into a DOM element of its own.
  return (
    <div
      ref={container}
      style={{
        ...MAP_STYLE,
        borderRadius: shape.boxRadius,
        backgroundColor: theme.backgroundElement,
      }}
    />
  );
}

const AREA_PANE = 'area';

const MAP_STYLE = {
  height: 360,
  overflow: 'hidden',
  // Keeps Leaflet's panes below the app's navigation and dialogs.
  zIndex: 0,
} as const;
