import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CommunityRequirements = {
  accountAgeDaysRequired: number;
  distinctBadgesRequired: number;
  uniqueVisitsRequired: number;
};

export function CommunitySubmissionInfoModal({
  error,
  isSaving = false,
  onClose,
  requirements,
  visible,
}: {
  error?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  requirements: CommunityRequirements;
  visible: boolean;
}) {
  const theme = useTheme();

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
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.heading}>
              <ThemedText accessibilityRole="header" type="title">
                You’re a Community Contributor!
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                You can now suggest new locations for the Tuna Bassoon map.
              </ThemedText>
            </View>

            <ThemedView
              type="backgroundSelected"
              style={styles.earnedCard}>
              <ThemedText type="smallBold">How This Is Earned</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Community Contributor access unlocks after an account has
                been active for {requirements.accountAgeDaysRequired} days,
                checked into {requirements.uniqueVisitsRequired} unique
                locations, and earned {requirements.distinctBadgesRequired}{' '}
                different badges. Administrators can also grant or suspend
                access when necessary.
              </ThemedText>
            </ThemedView>

            <View style={styles.section}>
              <ThemedText type="subtitle">What You Can Do</ThemedText>
              <ThemedText themeColor="textSecondary">
                Use Submit a Location in Settings to share a place, its map
                position, historical information, and a reliable source.
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Your suggestion stays private while Dan or Ali reviews it.
                Automated checks may suggest tags, flag missing information,
                identify possible duplicates, or hold unsafe language for
                review. They never publish a location automatically.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Submission Guidelines</ThemedText>
              <View style={styles.guidelineList}>
                <ThemedText themeColor="textSecondary">
                  • Submit accurate information and identify the source you
                  used.
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  • Place the map pin carefully and mention useful entrance or
                  landmark details.
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  • You may have up to three locations awaiting review at one
                  time, with a maximum of five submissions per hour.
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  • Repeated spam, intentionally false information, or abusive
                  content may suspend submission access.
                </ThemedText>
              </View>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Community Contributors never publish directly. Regional
              Moderator is a future, manually granted role for trusted
              community review.
            </ThemedText>

            {error ? (
              <ThemedText
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Got It"
              disabled={isSaving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator color={Palette.paper} />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.primaryButtonText}>
                  Got It
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(20, 26, 19, 0.72)',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    alignSelf: 'center',
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: 620,
    padding: Spacing.four,
    width: '100%',
  },
  heading: {
    gap: Spacing.one,
  },
  earnedCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  guidelineList: {
    gap: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.bronzeDeep,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: Palette.paper,
  },
  errorText: {
    color: Palette.danger,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
