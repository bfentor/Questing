import type { LatLng } from '@questing/api';

export type LocationPinProps = {
  /** Where the pin is, if anywhere. */
  value: LatLng | null;
  /** Where the map looks; it moves only when this changes, not when the pin does. */
  center: LatLng | null;
  /** Tapping the map moves the pin there. Without it the map only shows where the pin is. */
  onChange?: (location: LatLng) => void;
  /** Read out by screen readers, for a map that only shows the pin (web). */
  label?: string;
};

// All of Finland, for placing a pin from scratch.
const OVERVIEW = { lat: 64.5, lng: 26, zoom: 5 };

/** Close enough to see streets around `center`, or the overview without one. */
export function cameraFor(center: LatLng | null) {
  return center ? { ...center, zoom: 15 } : OVERVIEW;
}

/** A link that opens directions to `location` in a maps app (Apple Maps on iPhones). */
export function directionsUrl(location: LatLng, apple: boolean) {
  const at = `${location.lat},${location.lng}`;
  return apple
    ? `https://maps.apple.com/?daddr=${at}`
    : `https://www.google.com/maps/dir/?api=1&destination=${at}`;
}
