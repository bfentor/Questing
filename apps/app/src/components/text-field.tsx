import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { ThemedText } from './themed-text';

type TextFieldProps = TextInputProps & { label: string };

export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  const shape = useShape();
  const theme = useTheme();

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
          { color: theme.text, backgroundColor: theme.backgroundElement },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
