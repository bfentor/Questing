import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { FontFamily } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { ThemedText } from './themed-text';

type TextFieldProps = TextInputProps & {
  label: string;
  /**
   * Keep password managers from filling it in or offering logins, e.g. for a username that
   * isn't the one people sign in with. They ignore autoComplete="off" but honour these.
   */
  notALogin?: boolean;
};

// data-bwignore (Bitwarden), data-1p-ignore (1Password) and data-lpignore (LastPass), on the web.
const IGNORED_BY_PASSWORD_MANAGERS = {
  dataSet: { bwignore: 'true', '1pIgnore': 'true', lpignore: 'true' },
};

export function TextField({
  label,
  style,
  notALogin,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const shape = useShape();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        // Screen readers (and the web's <label> semantics) announce the field by its label.
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          shape.field,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            // The field being typed in is outlined in the accent.
            borderColor: focused ? theme.tint : theme.backgroundSelected,
          },
          style,
        ]}
        {...(notALogin ? IGNORED_BY_PASSWORD_MANAGERS : {})}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    fontFamily: FontFamily.body,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
