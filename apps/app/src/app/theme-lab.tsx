import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ColorSwatch } from '@/components/color-swatch';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing, type ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { setAppearance } from '@/lib/appearance';
import {
  isChanged,
  resetThemeColors,
  setThemeColor,
  THEME_TOKENS,
  themeAsCode,
  usePalette,
  type Scheme,
} from '@/lib/theme-lab';

// A developer tool, so its text is English only and it isn't translated.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Development only: edit the app's colours live, then copy them into constants/theme.ts. */
export default function ThemeLabRoute() {
  return __DEV__ ? <ThemeLab /> : <Redirect href="/" />;
}

function ThemeLab() {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const light = usePalette('light');
  const dark = usePalette('dark');
  const palette = scheme === 'dark' ? dark : light;
  const [copied, setCopied] = useState(false);
  const code = themeAsCode(light, dark);

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
    <Screen hasHeader>
      <ThemedText themeColor="textSecondary">
        Changes apply to the whole app right away and are kept on this device. To make them
        permanent, copy the code below into src/constants/theme.ts.
      </ThemedText>

      <SegmentedControl
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={scheme}
        onChange={(next) => setAppearance(next)}
      />

      <View style={styles.section}>
        <ThemedText type="heading">Colours ({scheme})</ThemedText>
        {THEME_TOKENS.map((token) => (
          <ColorRow
            key={token}
            scheme={scheme}
            token={token}
            value={palette[token]}
            changed={isChanged(scheme, token, palette[token])}
          />
        ))}
      </View>

      <Preview />

      <View style={styles.section}>
        <ThemedText type="heading">Code</ThemedText>
        <ThemedView type="backgroundElement" style={styles.code}>
          <ThemedText type="code" selectable>
            {code}
          </ThemedText>
        </ThemedView>
        <Button
          title={copied ? 'Copied' : Platform.OS === 'web' ? 'Copy as code' : 'Share as code'}
          onPress={copy}
        />
        <Button title="Reset to theme.ts" variant="secondary" onPress={resetThemeColors} />
      </View>
    </Screen>
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
      <View style={styles.rowLabel}>
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
          {
            color: HEX.test(shown) ? theme.text : theme.danger,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      />
    </View>
  );
}

/** Samples of every colour in use, to judge the palette without leaving the screen. */
function Preview() {
  const noop = () => {};

  return (
    <View style={styles.section}>
      <ThemedText type="heading">Preview</ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="heading">Friday board games</ThemedText>
        <ThemedText themeColor="textSecondary">Tomorrow, 18:00 · Student union</ThemedText>
        <ThemedText>
          Bring a game or learn a new one. <ThemedText themeColor="tint">#boardgames</ThemedText>
        </ThemedText>
        <View style={styles.chips}>
          <ThemedView type="backgroundSelected" style={styles.chip}>
            <ThemedText type="small">Selected</ThemedText>
          </ThemedView>
          <ThemedView type="background" style={styles.chip}>
            <ThemedText type="small">Not selected</ThemedText>
          </ThemedView>
        </View>
        <ThemedText type="small" themeColor="danger">
          Only 2 places left
        </ThemedText>
      </ThemedView>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="Going" onPress={noop} />
        </View>
        <View style={styles.button}>
          <Button title="Maybe" variant="secondary" onPress={noop} />
        </View>
        <View style={styles.button}>
          <Button title="Cancel" variant="danger" onPress={noop} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
  hex: {
    width: 120,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  code: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
