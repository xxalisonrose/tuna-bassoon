import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AvailabilityDateTimeFieldProps } from './availability-date-time-field.types';

export function AvailabilityDateTimeField({
  disabled,
  label,
  onChange,
  value,
}: AvailabilityDateTimeFieldProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Format: YYYY-MM-DD HH:MM in your local time
      </ThemedText>
      <TextInput
        accessibilityLabel={label + ' date and time'}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD HH:MM"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            borderColor: theme.borderStrong,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
