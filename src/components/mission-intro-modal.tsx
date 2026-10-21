import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeArtwork } from '@/components/badge-artwork';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';

type MissionIntroModalProps = {
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onOpenPassport: () => void;
  visible: boolean;
};

export function MissionIntroModal({
  error,
  isSaving,
  onClose,
  onOpenPassport,
  visible,
}: MissionIntroModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <ThemedView
            accessibilityViewIsModal
            type="backgroundElement"
            style={styles.card}>
            <BadgeArtwork
              earned
              imageKey="mission-tutorial"
              name="Welcome to Lorcal"
              size="celebration"
            />

            <View style={styles.copy}>
              <ThemedText accessibilityRole="header" type="title">
                Your First Mission
              </ThemedText>
              <ThemedText type="subtitle">
                Welcome to Lorcal
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Your first mission teaches the basics by asking you to use
                the map, Passport, badge system, and avatar wardrobe.
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Check in at five places, earn any non-Mission badge, and
                save an avatar look. Progress updates automatically as you
                complete each goal.
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Finish all three goals to earn the New Explorer badge and
                unlock the cow-print New Explorer Shirt.
              </ThemedText>
            </View>

            {error ? (
              <ThemedText
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: isSaving, disabled: isSaving }}
                disabled={isSaving}
                onPress={onOpenPassport}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabled,
                ]}>
                {isSaving ? (
                  <ActivityIndicator color={Palette.ink} size="small" />
                ) : (
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    View Mission
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabled,
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Not Now
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(20, 24, 18, 0.72)',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignSelf: 'center',
    borderRadius: Spacing.four,
    gap: Spacing.three,
    maxWidth: 560,
    padding: Spacing.four,
    width: '100%',
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 150,
    paddingHorizontal: Spacing.three,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: Spacing.three,
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  errorText: {
    color: Palette.danger,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
  },
  disabled: {
    opacity: 0.55,
  },
});
