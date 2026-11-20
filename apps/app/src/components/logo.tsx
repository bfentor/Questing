import { Image } from 'expo-image';

/**
 * The Questing logo: a map pin whose point is the tail of a Q, on the app's indigo. An SVG, so it's
 * sharp at any size; scripts/make-icons draws it (and every app and website icon). Screen
 * readers skip it: the name beside it says what it is.
 */
export function Logo({ size }: { size: number }) {
  return (
    <Image
      source={require('@/assets/logo/logo.svg')}
      style={{ width: size, height: size }}
      accessible={false}
      accessibilityLabel=""
    />
  );
}
