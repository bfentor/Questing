import { Image } from 'expo-image';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ZoomSlider } from './zoom-slider';

/** Part of a picture, as fractions of its width and height from the top left. */
export type CropRect = { x: number; y: number; width: number; height: number };
type Picture = { url: string; width: number; height: number };

const MAX_ZOOM = 4;
const MAX_FRAME_WIDTH = 440;

type ImageCropperProps = {
  /** The whole picture to frame; null while closed. */
  picture: Picture | null;
  /** Width divided by height of the frame, e.g. 1 for profile pictures. */
  aspect: number;
  /** Show the frame as a circle, like profile pictures. */
  round?: boolean;
  /** Where it was framed before, to start from. */
  initial?: CropRect | null;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onDone: (crop: CropRect) => void;
};

/**
 * Frames a picture: drag it around, zoom with the slider, pinch or (on the web) the scroll
 * wheel. The picture always fills the frame; what's inside it is the crop.
 */
export function ImageCropper({ picture, ...props }: ImageCropperProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Modal
      visible={picture !== null}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={props.onCancel}>
      {/* Keyed, so a new picture starts afresh. */}
      {picture ? <Cropper key={picture.url} picture={picture} {...props} /> : null}
    </Modal>
  );
}

type Geometry = { frameWidth: number; frameHeight: number; width: number; height: number };
/** Where the frame's middle is on the picture (as fractions), and how far it's zoomed in. */
type Framing = { cx: number; cy: number; zoom: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The picture's size on screen at a zoom: at 1 it just covers the frame. */
function shown(geometry: Geometry, zoom: number) {
  const cover = Math.max(
    geometry.frameWidth / geometry.width,
    geometry.frameHeight / geometry.height,
  );
  return { width: geometry.width * cover * zoom, height: geometry.height * cover * zoom };
}

/** The view, zoomed between 1 and MAX_ZOOM and moved so the picture still fills the frame. */
function fit(geometry: Geometry, view: Framing): Framing {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM);
  const size = shown(geometry, zoom);
  const halfWidth = geometry.frameWidth / (2 * size.width);
  const halfHeight = geometry.frameHeight / (2 * size.height);
  return {
    zoom,
    cx: clamp(view.cx, halfWidth, 1 - halfWidth),
    cy: clamp(view.cy, halfHeight, 1 - halfHeight),
  };
}

function startingView(geometry: Geometry, initial: CropRect | null | undefined): Framing {
  if (!initial) {
    return { cx: 0.5, cy: 0.5, zoom: 1 };
  }
  // The crop's width, in pixels of the picture as shown at zoom 1, fills the frame.
  const cropWidthAtOne = shown(geometry, 1).width * initial.width;
  return fit(geometry, {
    cx: initial.x + initial.width / 2,
    cy: initial.y + initial.height / 2,
    zoom: geometry.frameWidth / cropWidthAtOne,
  });
}

function cropOf(geometry: Geometry, view: Framing): CropRect {
  const size = shown(geometry, view.zoom);
  const width = Math.min(1, geometry.frameWidth / size.width);
  const height = Math.min(1, geometry.frameHeight / size.height);
  return {
    x: clamp(view.cx - width / 2, 0, 1 - width),
    y: clamp(view.cy - height / 2, 0, 1 - height),
    width,
    height,
  };
}

function Cropper({
  picture,
  aspect,
  round,
  initial,
  busy,
  error,
  onCancel,
  onDone,
}: Omit<ImageCropperProps, 'picture'> & { picture: Picture }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shape = useShape();
  const screen = useWindowDimensions();
  const frameWidth = Math.min(MAX_FRAME_WIDTH, screen.width - 2 * (Spacing.four + Spacing.three));
  const geometry: Geometry = {
    frameWidth,
    frameHeight: frameWidth / aspect,
    width: picture.width,
    height: picture.height,
  };
  const [framing, setFraming] = useState(() => startingView(geometry, initial));
  // The gesture handlers are made once; they read the frame's current size from here.
  const latest = useRef(geometry);
  useEffect(() => {
    latest.current = geometry;
  });

  // Where the last move event was, to move by the difference (and the fingers' distance).
  const last = useRef<{ dx: number; dy: number; pinch: number | null }>({
    dx: 0,
    dy: 0,
    pinch: null,
  });
  // The handlers only read the refs while a gesture happens, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        last.current = { dx: 0, dy: 0, pinch: null };
      },
      onPanResponderMove: (event: GestureResponderEvent, gesture) => {
        const touches = event.nativeEvent.touches ?? [];
        const moved = { dx: gesture.dx - last.current.dx, dy: gesture.dy - last.current.dy };
        if (touches.length >= 2) {
          const pinch = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          const before = last.current.pinch;
          if (before) {
            setFraming((current) =>
              fit(latest.current, { ...current, zoom: (current.zoom * pinch) / before }),
            );
          }
          last.current = { dx: gesture.dx, dy: gesture.dy, pinch };
          return;
        }
        setFraming((current) => {
          const size = shown(latest.current, current.zoom);
          return fit(latest.current, {
            ...current,
            cx: current.cx - moved.dx / size.width,
            cy: current.cy - moved.dy / size.height,
          });
        });
        last.current = { dx: gesture.dx, dy: gesture.dy, pinch: null };
      },
    }),
  );

  // The scroll wheel zooms on the web.
  const frame = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const node = frame.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !node?.addEventListener) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setFraming((current) =>
        fit(latest.current, { ...current, zoom: current.zoom * Math.exp(-event.deltaY / 400) }),
      );
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  const fitted = fit(geometry, framing);
  const size = shown(geometry, fitted.zoom);

  return (
    <View style={styles.backdrop}>
      <ThemedView style={[styles.panel, shape.dialog]}>
        <ThemedText type="heading">{t('crop.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('crop.hint')}
        </ThemedText>
        <View
          ref={frame}
          {...responder.panHandlers}
          style={[
            styles.frame,
            {
              width: geometry.frameWidth,
              height: geometry.frameHeight,
              borderRadius: round ? geometry.frameWidth / 2 : shape.picture.borderRadius,
              backgroundColor: theme.backgroundElement,
            },
          ]}>
          <Image
            source={{ uri: picture.url }}
            // The frame takes the drags; a browser would otherwise drag the image itself.
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: geometry.frameWidth / 2 - fitted.cx * size.width,
              top: geometry.frameHeight / 2 - fitted.cy * size.height,
              width: size.width,
              height: size.height,
            }}
          />
        </View>
        <ZoomSlider
          value={fitted.zoom}
          min={1}
          max={MAX_ZOOM}
          onChange={(zoom) => setFraming(fit(geometry, { ...fitted, zoom }))}
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title={t('common.cancel')} variant="secondary" onPress={onCancel} />
          </View>
          <View style={styles.button}>
            <Button
              title={t('crop.done')}
              loading={busy}
              onPress={() => onDone(cropOf(geometry, fitted))}
            />
          </View>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    gap: Spacing.three,
    padding: Spacing.three,
    maxWidth: MAX_FRAME_WIDTH + 2 * Spacing.three,
  },
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    // A hand on the web, to show it can be dragged.
    cursor: 'grab',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
});
