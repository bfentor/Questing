import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { ColorSwatch } from '@/components/color-swatch';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Fonts,
  MaxContentWidth,
  Spacing,
  type ShapeToken,
  type ThemeColor,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { setAppearance } from '@/lib/appearance';
import {
  isColorChanged,
  lookAsCode,
  resetLook,
  setLook,
  setShape,
  setThemeColor,
  THEME_TOKENS,
  useLook,
  type Look,
  type Palette,
  type Scheme,
} from '@/lib/theme-lab';
import { contrastRatio, PRESETS, randomLook } from '@/lib/theme-presets';

// A developer tool, so its text is English only and it isn't translated.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** From this width the controls and the preview sit side by side. */
const WIDE = 960;

const RADII = [0, 4, 8, 12, 16, 24, 999];
const CORNERS: { token: ShapeToken; label: string; hint: string }[] = [
  { token: 'boxRadius', label: 'Boxes', hint: 'Cards, panels, pictures, dialogs' },
  { token: 'buttonRadius', label: 'Buttons', hint: 'Buttons and segmented controls' },
  { token: 'fieldRadius', label: 'Fields', hint: 'Text inputs and date fields' },
  { token: 'selectorRadius', label: 'Selectors', hint: 'Chips, pills, checkboxes' },
];

/** Development only: edit the app's look live, then copy it into constants/theme.ts. */
export default function ThemeLabRoute() {
  return __DEV__ ? <ThemeLab /> : <Redirect href="/" />;
}

function ThemeLab() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const look = useLook();

  const controls = (
    <>
      <ThemedText themeColor="textSecondary">
        Changes apply to the whole app right away and are kept on this device. To make them
        permanent, copy the code at the bottom into src/constants/theme.ts.
      </ThemedText>
      <Presets look={look} scheme={scheme} />
      <SegmentedControl
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={scheme}
        onChange={(next) => setAppearance(next)}
      />
      <ColorControls look={look} scheme={scheme} />
      <ShapeControls look={look} />
      {wide ? null : <Preview look={look} scheme={scheme} />}
      <Code look={look} />
    </>
  );

  const padding = { paddingBottom: insets.bottom + Spacing.six };

  if (!wide) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.column, styles.narrow, padding]}>
        {controls}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.split, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.sidebar, { borderColor: theme.backgroundSelected }]}
        contentContainerStyle={[styles.column, padding]}>
        {controls}
      </ScrollView>
      <ScrollView
        style={styles.main}
        // As wide as the app's own pages, so the preview looks like them.
        contentContainerStyle={[styles.column, styles.narrow, padding]}>
        <Preview look={look} scheme={scheme} />
      </ScrollView>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

/** Ready-made looks to start from, each drawn in its own colours and corners. */
function Presets({ look, scheme }: { look: Look; scheme: Scheme }) {
  const theme = useTheme();
  const current = JSON.stringify(look);

  return (
    <Section title="Presets">
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const palette = preset.look[scheme];
          const active = JSON.stringify(preset.look) === current;
          return (
            <Pressable
              key={preset.name}
              role="button"
              aria-label={`Use the ${preset.name} preset`}
              onPress={() => setLook(preset.look)}
              style={({ pressed }) => [
                styles.preset,
                {
                  borderRadius: Math.min(preset.look.shape.boxRadius, 16),
                  backgroundColor: palette.background,
                  borderColor: active ? theme.tint : palette.backgroundSelected,
                  borderWidth: active ? 2 : 1,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: palette.text }}>
                {preset.name}
              </ThemedText>
              <View style={styles.dots}>
                {(['tint', 'backgroundElement', 'textSecondary', 'danger'] as const).map(
                  (token) => (
                    <View
                      key={token}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: palette[token],
                          borderRadius: Math.min(preset.look.shape.selectorRadius, 8),
                        },
                      ]}
                    />
                  ),
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button title="Random" variant="secondary" onPress={() => setLook(randomLook())} />
        </View>
        <View style={styles.grow}>
          <Button title="Reset to theme.ts" variant="secondary" onPress={resetLook} />
        </View>
      </View>
    </Section>
  );
}

function ColorControls({ look, scheme }: { look: Look; scheme: Scheme }) {
  return (
    <Section title={`Colours (${scheme})`}>
      {THEME_TOKENS.map((token) => (
        <ColorRow
          key={token}
          scheme={scheme}
          token={token}
          value={look[scheme][token]}
          changed={isColorChanged(scheme, token, look[scheme][token])}
        />
      ))}
    </Section>
  );
}

type ColorRowProps = {
  scheme: Scheme;
  token: ThemeColor;
  value: string;
  changed: boolean;
};

function ColorRow({ scheme, token, value, changed }: ColorRowProps) {
  const theme = useTheme();
  const shape = useShape();
  // What's typed while the field is being edited; only valid hex codes reach the theme.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  const type = (next: string) => {
    setDraft(next);
    if (HEX.test(next)) setThemeColor(scheme, token, next);
  };

  return (
    <View style={styles.row}>
      <ColorSwatch
        label={token}
        value={value}
        onChange={(next) => setThemeColor(scheme, token, next)}
      />
      <View style={styles.grow}>
        <ThemedText type="smallBold">{token}</ThemedText>
        {changed ? (
          <ThemedText type="small" themeColor="tint">
            changed
          </ThemedText>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel={`${token} hex code`}
        value={shown}
        onChangeText={type}
        onBlur={() => setDraft(null)}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        maxLength={9}
        style={[
          styles.hex,
          shape.field,
          {
            color: HEX.test(shown) ? theme.text : theme.danger,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      />
    </View>
  );
}

function ShapeControls({ look }: { look: Look }) {
  const { shape } = look;

  return (
    <>
      <Section title="Corners">
        {CORNERS.map(({ token, label, hint }) => (
          <View key={token} style={styles.control}>
            <ThemedText type="smallBold">{label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {hint}
            </ThemedText>
            <Options
              label={label}
              options={RADII.map((value) => ({
                value,
                label: value >= 999 ? 'Full' : String(value),
                corner: value,
              }))}
              value={shape[token]}
              onChange={(value) => setShape(token, value)}
            />
          </View>
        ))}
      </Section>
      <Section title="Border" hint="Outline around cards, dialogs and inputs.">
        <Options
          label="Border"
          options={[0, 1, 1.5, 2, 3].map((value) => ({
            value,
            label: value ? `${value}px` : 'None',
          }))}
          value={shape.border}
          onChange={(value) => setShape('border', value)}
        />
      </Section>
      <Section title="Depth" hint="Shadow under cards, dialogs and filled buttons.">
        <Options
          label="Depth"
          options={[
            { value: 0, label: 'Flat' },
            { value: 1, label: 'Subtle' },
            { value: 2, label: 'Raised' },
          ]}
          value={shape.depth}
          onChange={(value) => setShape('depth', value)}
        />
      </Section>
      <Section
        title="Control height"
        hint={
          shape.controlHeight < 44
            ? 'Below 44 is smaller than a comfortable touch target on phones.'
            : 'Buttons and single-line inputs.'
        }>
        <Options
          label="Control height"
          options={[36, 40, 44, 48, 52, 56].map((value) => ({ value, label: String(value) }))}
          value={shape.controlHeight}
          onChange={(value) => setShape('controlHeight', value)}
        />
      </Section>
    </>
  );
}

type OptionsProps = {
  label: string;
  options: { value: number; label: string; corner?: number }[];
  value: number;
  onChange: (value: number) => void;
};

/** A row of choices; corner options show a square rounded by that much. */
function Options({ label, options, value, onChange }: OptionsProps) {
  const theme = useTheme();

  return (
    <View style={styles.options} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            aria-label={`${label}: ${option.label}`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: selected ? theme.tint : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            {option.corner !== undefined ? (
              <View
                style={[
                  styles.corner,
                  {
                    borderColor: selected ? theme.tint : theme.textSecondary,
                    borderTopLeftRadius: Math.min(option.corner, 24),
                  },
                ]}
              />
            ) : null}
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Real components in the current look, to judge it without leaving the screen. */
function Preview({ look, scheme }: { look: Look; scheme: Scheme }) {
  const theme = useTheme();
  const shape = useShape();
  const [tab, setTab] = useState<'events' | 'posts'>('events');
  const [notify, setNotify] = useState(true);
  const [title, setTitle] = useState('Friday board games');
  const noop = () => {};

  return (
    <>
      <Section title="Preview">
        <ThemedView type="backgroundElement" style={[styles.card, shape.box]}>
          <ThemedView type="backgroundSelected" style={[styles.cover, shape.inner]} />
          <View style={styles.row}>
            <Avatar name="Jemina Example" size={40} />
            <View style={styles.grow}>
              <ThemedText type="heading">{title || 'Untitled event'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tomorrow, 18:00 · Student union
              </ThemedText>
            </View>
          </View>
          <ThemedText>
            Bring a game or learn a new one. <ThemedText themeColor="tint">#boardgames</ThemedText>
          </ThemedText>
          <View style={styles.chips}>
            {['Games', 'Social', 'Free'].map((chip, index) => (
              <View
                key={chip}
                style={[
                  styles.chip,
                  shape.selector,
                  { backgroundColor: index === 0 ? theme.tint : theme.background },
                ]}>
                <ThemedText type="small" themeColor={index === 0 ? 'onTint' : 'text'}>
                  {chip}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.progress}>
            <ThemedText type="small" themeColor="danger">
              Only 2 places left
            </ThemedText>
            <ThemedView type="background" style={[styles.track, shape.selector]}>
              <View style={[styles.bar, shape.selector, { backgroundColor: theme.danger }]} />
            </ThemedView>
          </View>
        </ThemedView>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button title="Going" onPress={noop} />
          </View>
          <View style={styles.grow}>
            <Button title="Maybe" variant="secondary" onPress={noop} />
          </View>
          <View style={styles.grow}>
            <Button title="Cancel" variant="danger" onPress={noop} />
          </View>
        </View>
        <SegmentedControl
          options={[
            { value: 'events', label: 'Events' },
            { value: 'posts', label: 'Posts' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <TextField label="Event name" value={title} onChangeText={setTitle} />
        <Checkbox checked={notify} onChange={setNotify} label="Notify my followers" />
      </Section>

      <Section title="Dialog">
        <ThemedView type="backgroundElement" style={[styles.backdrop, shape.inner]}>
          <ThemedView type="background" style={[styles.dialog, shape.dialog]}>
            <ThemedText type="heading">Cancel this event?</ThemedText>
            <ThemedText themeColor="textSecondary">
              Everyone who said they&apos;re going gets a notification.
            </ThemedText>
            <View style={styles.row}>
              <View style={styles.grow}>
                <Button title="Keep it" variant="secondary" onPress={noop} />
              </View>
              <View style={styles.grow}>
                <Button title="Cancel event" variant="danger" onPress={noop} />
              </View>
            </View>
          </ThemedView>
        </ThemedView>
      </Section>

      <Contrast palette={look[scheme]} scheme={scheme} />
    </>
  );
}

const CONTRAST_PAIRS: { label: string; fg: ThemeColor; bg: ThemeColor }[] = [
  { label: 'Text on background', fg: 'text', bg: 'background' },
  { label: 'Text on cards', fg: 'text', bg: 'backgroundElement' },
  { label: 'Secondary text on background', fg: 'textSecondary', bg: 'background' },
  { label: 'Secondary text on cards', fg: 'textSecondary', bg: 'backgroundElement' },
  { label: 'Links on background', fg: 'tint', bg: 'background' },
  { label: 'Button text on tint', fg: 'onTint', bg: 'tint' },
  { label: 'Button text on danger', fg: 'onTint', bg: 'danger' },
  { label: 'Danger text on background', fg: 'danger', bg: 'background' },
];

/** WCAG contrast of the pairs the app draws text with; 4.5 is the AA minimum for body text. */
function Contrast({ palette, scheme }: { palette: Palette; scheme: Scheme }) {
  return (
    <Section title={`Contrast (${scheme})`} hint="4.5 or more is readable for body text (AA).">
      {CONTRAST_PAIRS.map(({ label, fg, bg }) => {
        const ratio = contrastRatio(palette[fg], palette[bg]);
        const passes = ratio >= 4.5;
        return (
          <View key={label} style={styles.row}>
            <View style={[styles.sample, { backgroundColor: palette[bg] }]}>
              <ThemedText type="smallBold" style={{ color: palette[fg] }}>
                Aa
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.grow}>
              {label}
            </ThemedText>
            <ThemedText type="smallBold" themeColor={passes ? 'text' : 'danger'}>
              {ratio.toFixed(1)} {passes ? '✓' : '✗'}
            </ThemedText>
          </View>
        );
      })}
    </Section>
  );
}

function Code({ look }: { look: Look }) {
  const shape = useShape();
  const [copied, setCopied] = useState(false);
  const code = lookAsCode(look);

  const copy = async () => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      await Share.share({ message: code });
    }
  };

  return (
    <Section title="Code" hint="Replaces Colors and Shape in src/constants/theme.ts.">
      <ThemedView type="backgroundElement" style={[styles.code, shape.inner]}>
        <ThemedText type="code" selectable>
          {code}
        </ThemedText>
      </ThemedView>
      <Button
        title={copied ? 'Copied' : Platform.OS === 'web' ? 'Copy as code' : 'Share as code'}
        onPress={copy}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 440,
    flexGrow: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
  },
  column: {
    gap: Spacing.four,
    padding: Spacing.three,
    paddingTop: Spacing.four,
  },
  narrow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  control: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  preset: {
    flexGrow: 1,
    flexBasis: 120,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 16,
    height: 16,
  },
  hex: {
    width: 120,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  option: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 2,
  },
  corner: {
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  cover: {
    aspectRatio: 3,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  progress: {
    gap: Spacing.one,
  },
  track: {
    height: 8,
    overflow: 'hidden',
  },
  bar: {
    width: '80%',
    height: '100%',
  },
  backdrop: {
    padding: Spacing.four,
  },
  dialog: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  sample: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
  },
  code: {
    padding: Spacing.three,
  },
});
