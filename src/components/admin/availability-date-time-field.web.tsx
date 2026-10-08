import type { ChangeEvent, CSSProperties } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { AvailabilityDateTimeFieldProps } from './availability-date-time-field.types';

function splitDateTime(value: string) {
  const [date = '', time = ''] = value.split(/[ T]/, 2);

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    time: /^\d{2}:\d{2}$/.test(time) ? time : '',
  };
}

export function AvailabilityDateTimeField({
  disabled,
  label,
  minimumDate,
  onChange,
  value,
}: AvailabilityDateTimeFieldProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const parts = splitDateTime(value);
  const inputStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 48,
    border: '1px solid ' + theme.borderStrong,
    borderRadius: Spacing.two,
    padding: Spacing.two + 'px ' + Spacing.three + 'px',
    background: theme.background,
    color: theme.text,
    colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
    font: 'inherit',
  };

  const updateDate = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value + 'T' + parts.time);
  };

  const updateTime = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(parts.date + 'T' + event.currentTarget.value);
  };

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.pickerRow}>
        <ThemedView style={styles.pickerPart}>
          <ThemedText type="small">Date</ThemedText>
          <input
            aria-label={label + ' date'}
            disabled={disabled}
            min={minimumDate}
            onChange={updateDate}
            style={inputStyle}
            type="date"
            value={parts.date}
          />
        </ThemedView>
        <ThemedView style={styles.pickerPart}>
          <ThemedText type="small">Time</ThemedText>
          <input
            aria-label={label + ' time'}
            disabled={disabled}
            onChange={updateTime}
            step={60}
            style={inputStyle}
            type="time"
            value={parts.time}
          />
        </ThemedView>
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        Uses your computer&apos;s local date and time format.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pickerPart: {
    flex: 1,
    minWidth: 200,
    gap: Spacing.one,
  },
});
