import Constants from 'expo-constants';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PortalContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmbeddedBuildInfo = {
  sourceRevision?: string;
  sourceBranch?: string;
  sourceStatus?: 'clean' | 'modified' | 'packaged' | 'unknown';
  buildProfile?: string;
};

function readBuildInfo(value: unknown): EmbeddedBuildInfo {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as EmbeddedBuildInfo;
}

function getPlatformLabel() {
  switch (Platform.OS) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return Platform.OS;
  }
}

function getSourceStatusLabel(status: EmbeddedBuildInfo['sourceStatus']) {
  switch (status) {
    case 'clean':
      return 'Clean Source';
    case 'modified':
      return 'Local Changes';
    case 'packaged':
      return 'Packaged Build';
    default:
      return 'Revision Unavailable';
  }
}

export function BuildInfoPanel() {
  const theme = useTheme();
  const buildInfo = readBuildInfo(
    Constants.expoConfig?.extra?.buildInfo,
  );
  const appVersion = Constants.expoConfig?.version ?? 'Unavailable';
  const sourceRevision = buildInfo.sourceRevision ?? 'Unavailable';
  const sourceBranch = buildInfo.sourceBranch || 'Packaged build';
  const runType = __DEV__
    ? buildInfo.buildProfile === 'local'
      ? 'Local Development'
      : `${buildInfo.buildProfile ?? 'Development'} Development`
    : buildInfo.buildProfile === 'local'
      ? 'Release'
      : `${buildInfo.buildProfile ?? 'Release'} Release`;
  const sourceStatus = getSourceStatusLabel(buildInfo.sourceStatus);
  const revisionUnavailable = !buildInfo.sourceRevision;

  const details = [
    { label: 'App Version', value: appVersion },
    { label: 'Source Revision', value: sourceRevision, code: true },
    { label: 'Branch', value: sourceBranch, code: true },
    { label: 'Platform', value: getPlatformLabel() },
    { label: 'Run Type', value: runType },
  ];

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.panel, { borderColor: theme.border }]}
      accessibilityLabel={`Build Information. App version ${appVersion}. Source revision ${sourceRevision}. ${sourceStatus}.`}>
      <ThemedView style={styles.headingRow}>
        <ThemedText
          accessibilityRole="header"
          type="subtitle"
          style={styles.heading}>
          Build Information
        </ThemedText>

        <ThemedView
          style={[
            styles.statusPill,
            {
              backgroundColor:
                buildInfo.sourceStatus === 'modified'
                  ? theme.surfaceWarm
                  : theme.accentSoft,
            },
          ]}>
          <ThemedText type="smallBold" style={styles.statusText}>
            {sourceStatus}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedText themeColor="textSecondary">
        Use these details to confirm which portal or app build is currently open.
      </ThemedText>

      <ThemedView style={styles.detailsGrid}>
        {details.map((detail) => (
          <ThemedView
            key={detail.label}
            type="backgroundSelected"
            style={[styles.detailCard, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {detail.label}
            </ThemedText>
            <ThemedText
              type={detail.code ? 'code' : 'smallBold'}
              numberOfLines={1}
              selectable>
              {detail.value}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary">
        Share the Source Revision when reporting a problem. After pulling an
        update, restart Expo and confirm that the revision changed.
      </ThemedText>

      {revisionUnavailable ? (
        <ThemedText
          accessibilityRole="alert"
          type="smallBold"
          style={{ color: theme.danger }}>
          Restart Expo to load the source revision for this session.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: PortalContentWidth,
    padding: Spacing.four,
    width: '100%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  statusText: {
    textTransform: 'uppercase',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  detailCard: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexGrow: 1,
    gap: Spacing.one,
    minWidth: 150,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
