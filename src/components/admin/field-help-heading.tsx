import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldHelpHeadingProps = {
  help: string;
  label: string;
};

export function FieldHelpHeading({
  help,
  label,
}: FieldHelpHeadingProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const contextMenuProps = Platform.OS === 'web'
    ? {
        onContextMenu: (event: { preventDefault: () => void }) => {
          event.preventDefault();
          setOpen(true);
        },
      }
    : {};

  return (
    <View style={styles.container}>
      <Pressable
        {...contextMenuProps}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${open ? 'Close' : 'Open'} field help.`}
        accessibilityHint="Click, right-click, or press and hold to show what this field is used for."
        accessibilityState={{ expanded: open }}
        delayLongPress={350}
        onLongPress={() => setOpen(true)}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.heading,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
      </Pressable>

      {open ? (
        <ThemedView
          accessibilityLiveRegion="polite"
          type="backgroundSelected"
          style={[
            styles.helpCard,
            { borderColor: theme.borderStrong },
          ]}>
          <ThemedText type="smallBold">About {label}</ThemedText>
          <ThemedText>{help}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close help for ${label}`}
            onPress={() => setOpen(false)}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.closeButtonText}>Got It</ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  heading: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
  },
  label: {
    flexShrink: 1,
  },
  helpCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  closeButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: Palette.lightBronze,
  },
  closeButtonText: {
    color: Palette.ink,
  },
  pressed: {
    opacity: 0.8,
  },
});
