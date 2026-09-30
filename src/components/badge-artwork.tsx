import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const badgeArtworkSources = {
  'america-250': require('@/assets/images/badges/america-250.png'),
  'ghost-stories': require('@/assets/images/badges/ghost-stories.png'),
};

type BadgeArtworkProps = {
  earned?: boolean;
  imageKey?: string;
  name: string;
  size?: 'card' | 'celebration';
};

function getBadgeArtworkSource(imageKey?: string) {
  const normalizedKey = imageKey?.trim().toLowerCase();

  if (
    normalizedKey === undefined ||
    !(normalizedKey in badgeArtworkSources)
  ) {
    return undefined;
  }

  return badgeArtworkSources[
    normalizedKey as keyof typeof badgeArtworkSources
  ];
}

function getFallbackText(name: string) {
  const firstCharacter = name.trim().charAt(0).toUpperCase();
  return firstCharacter || '★';
}

export function BadgeArtwork({
  earned = false,
  imageKey,
  name,
  size = 'card',
}: BadgeArtworkProps) {
  const theme = useTheme();
  const source = getBadgeArtworkSource(imageKey);
  const isCelebration = size === 'celebration';

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        isCelebration ? styles.celebrationFrame : styles.cardFrame,
        {
          backgroundColor: theme.background,
          borderColor: theme.textSecondary,
        },
        !earned && styles.unearned,
      ]}>
      {source === undefined ? (
        <ThemedText
          style={[
            styles.fallbackText,
            isCelebration
              ? styles.celebrationFallbackText
              : styles.cardFallbackText,
          ]}>
          {getFallbackText(name)}
        </ThemedText>
      ) : (
        <Image
          contentFit="contain"
          source={source}
          style={styles.image}
          transition={150}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardFrame: {
    height: 72,
    width: 72,
  },
  celebrationFrame: {
    height: 132,
    marginBottom: 16,
    width: 132,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  fallbackText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  cardFallbackText: {
    fontSize: 30,
    lineHeight: 38,
  },
  celebrationFallbackText: {
    fontSize: 52,
    lineHeight: 62,
  },
  unearned: {
    opacity: 0.5,
  },
});
