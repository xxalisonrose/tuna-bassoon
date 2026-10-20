import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, PortalContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';

type ManualRole =
  | 'none'
  | 'community_contributor'
  | 'regional_moderator';

type PendingChange = {
  targetClerkUserId: string;
  userLabel: string;
  role: ManualRole;
  originalRole: ManualRole;
  willRetainEarnedAccess: boolean;
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  community_contributor: 'Community Contributor',
  explorer: 'Explorer',
  regional_moderator: 'Regional Moderator',
};

const sourceLabels: Record<string, string> = {
  admin: 'Admin configuration',
  earned: 'Earned automatically',
  manual: 'Manually granted',
  regional_moderator: 'Regional Moderator grant',
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return error instanceof Error
    ? error.message
    : 'Unable to update this user. Try again.';
}

function auditRoleLabel(role: string | null | undefined) {
  return role ? roleLabels[role] ?? role : 'No manual role';
}

export function UserAccessManager({ visible }: { visible: boolean }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [pendingChange, setPendingChange] =
    useState<PendingChange | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const users = useQuery(
    api.adminUsers.searchUsers,
    visible ? { search } : 'skip',
  );
  const auditLog = useQuery(
    api.adminUsers.getRecentRoleChanges,
    visible ? {} : 'skip',
  );
  const setManualContentRole = useMutation(
    api.adminUsers.setManualContentRole,
  );

  if (!visible) {
    return null;
  }

  const openStatusManager = (
    user: {
      clerkUserId: string;
      username: string | null;
      email: string | null;
      displayName: string | null;
      manualContentRole:
        | 'community_contributor'
        | 'regional_moderator'
        | null;
      requirements: {
        meetsAccountAge: boolean;
        meetsDistinctBadges: boolean;
        meetsUniqueVisits: boolean;
      };
    },
  ) => {
    const currentRole = user.manualContentRole ?? 'none';

    setPendingChange({
      targetClerkUserId: user.clerkUserId,
      userLabel:
        user.username ??
        user.displayName ??
        user.email ??
        'Unnamed user',
      role: currentRole,
      originalRole: currentRole,
      willRetainEarnedAccess:
        user.requirements.meetsAccountAge &&
        user.requirements.meetsDistinctBadges &&
        user.requirements.meetsUniqueVisits,
    });
    setReason('');
    setMessage(null);
    setError(null);
  };

  const saveChange = async () => {
    if (!pendingChange || saving) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const result = await setManualContentRole({
        targetClerkUserId: pendingChange.targetClerkUserId,
        role: pendingChange.role,
        reason: reason.trim() || undefined,
      });
      setMessage(
        result.changed
          ? `${pendingChange.userLabel} was updated.`
          : `${pendingChange.userLabel} already has that manual role.`,
      );
      setPendingChange(null);
      setReason('');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedView
        type="backgroundElement"
        style={[styles.sectionCard, { borderColor: theme.border }]}>
        <View style={styles.heading}>
          <ThemedText accessibilityRole="header" type="subtitle">
            Users & Access
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Find a registered user by username, name, or private email. Users
            appear here after opening the updated app at least once.
          </ThemedText>
        </View>

        <TextInput
          accessibilityLabel="Search users by username or email"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Search username, name, or email"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.background,
              borderColor: theme.borderStrong,
              color: theme.text,
            },
          ]}
          value={search}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Email addresses are shown only in this Admin workspace and are not
          part of public profiles.
        </ThemedText>
      </ThemedView>

      {message ? (
        <ThemedText
          accessibilityLiveRegion="polite"
          style={styles.feedbackText}>
          {message}
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      {pendingChange ? (
        <ThemedView
          type="backgroundElement"
          style={[
            styles.confirmCard,
            { borderColor: theme.borderStrong },
          ]}>
          <ThemedText accessibilityRole="header" type="subtitle">
            Manage Account Status
          </ThemedText>
          <ThemedText>
            Choose the manual account status for{' '}
            <ThemedText type="smallBold">
              {pendingChange.userLabel}
            </ThemedText>
            .
          </ThemedText>

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Account status"
            style={styles.statusChoiceList}>
            {(
              [
                {
                  role: 'none' as const,
                  title: 'Explorer',
                  description: 'No manually assigned contributor role.',
                },
                {
                  role: 'community_contributor' as const,
                  title: 'Community Contributor',
                  description: 'Can submit locations for administrator review.',
                },
                {
                  role: 'regional_moderator' as const,
                  title: 'Regional Moderator',
                  description:
                    'Includes submission access and reserves future moderation status.',
                },
              ] satisfies {
                role: ManualRole;
                title: string;
                description: string;
              }[]
            ).map((option) => {
              const selected = pendingChange.role === option.role;

              return (
                <Pressable
                  key={option.role}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setPendingChange((current) =>
                      current ? { ...current, role: option.role } : current,
                    )
                  }
                  style={({ pressed }) => [
                    styles.statusChoice,
                    { borderColor: theme.borderStrong },
                    selected && styles.statusChoiceSelected,
                    pressed && styles.pressed,
                  ]}>
                  <View
                    aria-hidden
                    style={[
                      styles.statusChoiceIndicator,
                      { borderColor: theme.borderStrong },
                      selected && styles.statusChoiceIndicatorSelected,
                    ]}
                  />
                  <View style={styles.statusChoiceCopy}>
                    <ThemedText type="smallBold">{option.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {pendingChange.role === 'none' &&
          pendingChange.willRetainEarnedAccess ? (
            <ThemedText themeColor="textSecondary">
              This user earned Community Contributor access. Removing a manual
              role will not remove their earned access.
            </ThemedText>
          ) : null}

          <ThemedText type="smallBold">Reason (Optional)</ThemedText>
          <TextInput
            accessibilityLabel="Optional reason for role change"
            maxLength={240}
            multiline
            onChangeText={setReason}
            placeholder="Why is this access changing?"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.reasonInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.borderStrong,
                color: theme.text,
              },
            ]}
            value={reason}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {reason.length} / 240
          </ThemedText>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save account status"
              disabled={
                saving || pendingChange.role === pendingChange.originalRole
              }
              onPress={() => void saveChange()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (saving ||
                  pendingChange.role === pendingChange.originalRole) &&
                  styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color={Palette.ink} size="small" />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.buttonText}>
                  Save Account Status
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel role change"
              disabled={saving}
              onPress={() => setPendingChange(null)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      ) : null}

      {users === undefined ? (
        <ActivityIndicator
          accessibilityLabel="Loading users"
          size="large"
        />
      ) : users.length === 0 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.emptyCard, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">No users found</ThemedText>
          <ThemedText themeColor="textSecondary">
            Check the spelling, or ask the person to open the updated app once
            so their searchable profile can be created.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.userList}>
          {users.map((user) => {
            const roleLabel = roleLabels[user.contentRole] ?? user.contentRole;
            const sourceLabel = user.accessSource
              ? sourceLabels[user.accessSource] ?? user.accessSource
              : 'No contributor access';

            return (
              <ThemedView
                key={user.clerkUserId}
                type="backgroundElement"
                style={[styles.userCard, { borderColor: theme.border }]}>
                <View style={styles.userHeadingRow}>
                  <View style={styles.userIdentity}>
                    <ThemedText type="subtitle">
                      {user.username
                        ? `@${user.username}`
                        : user.displayName ?? 'Username not chosen'}
                    </ThemedText>
                    {user.displayName && user.username ? (
                      <ThemedText themeColor="textSecondary">
                        {user.displayName}
                      </ThemedText>
                    ) : null}
                    {user.email ? (
                      <ThemedText
                        selectable
                        type="small"
                        themeColor="textSecondary">
                        {user.email}
                      </ThemedText>
                    ) : null}
                  </View>

                  <ThemedView
                    type="backgroundSelected"
                    style={styles.rolePill}>
                    <ThemedText type="smallBold">{roleLabel}</ThemedText>
                  </ThemedView>
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  Access source: {sourceLabel}
                </ThemedText>

                {user.isBlocked ? (
                  <ThemedText style={styles.errorText} type="smallBold">
                    Submission access is suspended by the project safety
                    override.
                  </ThemedText>
                ) : null}

                {!user.isAdmin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Manage account status for ${user.username ?? user.displayName ?? 'user'}`}
                    onPress={() => openStatusManager(user)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.manageStatusButton,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.buttonText}>
                      Manage Account Status
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Administrator access is managed in the secure deployment
                    configuration.
                  </ThemedText>
                )}
              </ThemedView>
            );
          })}
        </View>
      )}

      <ThemedView
        type="backgroundElement"
        style={[styles.sectionCard, { borderColor: theme.border }]}>
        <ThemedText accessibilityRole="header" type="subtitle">
          Recent Access Changes
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Manual grants and removals are retained so access decisions can be
          traced later.
        </ThemedText>

        {auditLog === undefined ? (
          <ActivityIndicator
            accessibilityLabel="Loading access history"
            size="small"
          />
        ) : auditLog.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No manual access changes have been recorded yet.
          </ThemedText>
        ) : (
          <View style={styles.auditList}>
            {auditLog.map((entry) => (
              <View key={entry._id} style={styles.auditEntry}>
                <ThemedText type="smallBold">
                  {entry.targetUsername
                    ? `@${entry.targetUsername}`
                    : entry.targetEmail ?? 'Registered user'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {auditRoleLabel(entry.previousManualRole)} →{' '}
                  {auditRoleLabel(entry.nextManualRole)} ·{' '}
                  {new Date(entry.changedAt).toLocaleString()}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Changed by{' '}
                  {entry.changedByUsername
                    ? `@${entry.changedByUsername}`
                    : 'an administrator'}
                </ThemedText>
                {entry.reason ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {entry.reason}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: PortalContentWidth,
    width: '100%',
  },
  sectionCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  heading: {
    gap: Spacing.one,
  },
  searchInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  userList: {
    gap: Spacing.three,
  },
  userCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  userHeadingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  userIdentity: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 220,
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  manageStatusButton: {
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  confirmCard: {
    borderRadius: Spacing.three,
    borderWidth: 2,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  statusChoiceList: {
    gap: Spacing.two,
  },
  statusChoice: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  statusChoiceSelected: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.bronzeDeep,
    borderWidth: 2,
  },
  statusChoiceIndicator: {
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  statusChoiceIndicatorSelected: {
    backgroundColor: Palette.lightBronze,
    borderColor: Palette.bronzeDeep,
  },
  statusChoiceCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  reasonInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  emptyCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.one,
    padding: Spacing.four,
  },
  auditList: {
    gap: Spacing.two,
  },
  auditEntry: {
    borderBottomColor: Palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
    paddingBottom: Spacing.two,
  },
  feedbackText: {
    color: Palette.bronzeDeep,
  },
  errorText: {
    color: Palette.danger,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
