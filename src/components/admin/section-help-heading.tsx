import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionHelpItem = {
  description: string;
  label: string;
};

type SectionHelpHeadingProps = {
  items: SectionHelpItem[];
  label: string;
};

export function SectionHelpHeading({
  items,
  label,
}: SectionHelpHeadingProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <ThemedView
        type="backgroundSelected"
        style={styles.heading}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <Pressable
          accessibilityLabel={`${open ? 'Close' : 'Open'} help for ${label}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((current) => !current)}
          style={({ pressed }) => [
            styles.helpButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText
            type="smallBold"
            style={styles.helpButtonText}>
            ?
          </ThemedText>
        </Pressable>
      </ThemedView>

      {open ? (
        <ThemedView
          accessibilityLiveRegion="polite"
          type="backgroundElement"
          style={[
            styles.helpCard,
            { borderColor: theme.borderStrong },
          ]}>
          {items.map((item) => (
            <ThemedView key={item.label} style={styles.helpItem}>
              <ThemedText type="smallBold">
                {item.label}
              </ThemedText>
              <ThemedText>{item.description}</ThemedText>
            </ThemedView>
          ))}
          <Pressable
            accessibilityLabel={`Close help for ${label}`}
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.closeButtonText}>
              Got It
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  heading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  helpButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Palette.lightBronze,
  },
  helpButtonText: {
    color: Palette.ink,
  },
  helpCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  helpItem: {
    gap: Spacing.one,
  },
  closeButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  closeButtonText: {
    color: Palette.ink,
  },
  pressed: {
    opacity: 0.8,
  },
});
