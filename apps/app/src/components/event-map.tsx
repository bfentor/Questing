import type { Event, LatLng } from '@questing/api';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet } from 'react-native';

import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';

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

/** Roughly fits a circle of `radiusKm` around the center on a phone-sized map. */
export function zoomFor(radiusKm: number) {
  return Math.round(14 - Math.log2(radiusKm));
}

/**
 * Events with a location as markers, on Apple Maps (iOS) or Google Maps
 * (Android), with the viewer's position and the search radius. Tapping a
 * marker selects its event; on iOS that needs iOS 18, older versions show
 * the title only. Tapping elsewhere can move the search (`onMove`); `centerLabel` is for the
 * web map's dot, as these show the device's own position.
 */
export function EventMap({ center, radiusKm, events, onSelect, onMove }: EventMapProps) {
  const shape = useShape();
  const theme = useTheme();
  const markers = events.flatMap((event) =>
    event.location
      ? [
          {
            id: String(event.id),
            title: event.title,
            coordinates: { latitude: event.location.lat, longitude: event.location.lng },
          },
        ]
      : [],
  );
  const cameraPosition = {
    coordinates: { latitude: center.lat, longitude: center.lng },
    zoom: zoomFor(radiusKm),
  };
  const reach = [
    {
      id: 'reach',
      center: { latitude: center.lat, longitude: center.lng },
      radius: radiusKm * 1000,
      color: withAlpha(theme.tint, 0.08),
      lineColor: theme.tint,
      lineWidth: 1.5,
    },
  ];
  const move = ({ coordinates }: { coordinates: { latitude?: number; longitude?: number } }) => {
    if (onMove && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
      onMove({ lat: coordinates.latitude, lng: coordinates.longitude });
    }
  };
  const select = (marker: { id?: string }) => {
    const event = events.find((candidate) => String(candidate.id) === marker.id);
    if (event) onSelect(event);
  };

  return Platform.OS === 'ios' ? (
    <AppleMaps.View
      style={[styles.map, shape.picture]}
      cameraPosition={cameraPosition}
      markers={markers}
      circles={reach}
      properties={{ isMyLocationEnabled: true }}
      onMarkerClick={select}
      onMapClick={move}
    />
  ) : (
    <GoogleMaps.View
      style={[styles.map, shape.picture]}
      cameraPosition={cameraPosition}
      markers={markers}
      circles={reach}
      properties={{ isMyLocationEnabled: true }}
      onMarkerClick={select}
      onMapClick={move}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    height: 360,
    overflow: 'hidden',
  },
});
