import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useMutation, useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type AvailabilityWindowManagerProps = {
  badgeDefinitionId: Id<'badgeDefinitions'> | null;
  visible: boolean;
  onPrepareBadge: () => Promise<Id<'badgeDefinitions'> | null>;
  onCombinedSaveComplete: () => void;
};

type AvailabilityWindow = {
  _id: Id<'badgeAvailabilityWindows'>;
  key: string;
  startsAt: number;
  endsAt: number;
};

type WindowFormState = {
  key: string;
  startsAt: string;
  endsAt: string;
};

type ValidatedWindowInput =
  | { ok: false; message: string }
  | {
      ok: true;
      key: string;
      startsAt: number;
      endsAt: number;
    };

const emptyForm: WindowFormState = {
  key: '',
  startsAt: '',
  endsAt: '',
};

function normalizeWindowKey(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return fallback;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);

  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
    ' ',
    padDatePart(date.getHours()),
    ':',
    padDatePart(date.getMinutes()),
  ].join('');
}

function parseLocalDateTime(value: string) {
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/,
  );

  if (match === null) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date.getTime();
}

function formatDisplayDate(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getWindowState(window: AvailabilityWindow, now: number) {
  if (now < window.startsAt) {
    return 'Upcoming';
  }

  if (now < window.endsAt) {
    return 'Active';
  }

  return 'Past';
}

export function AvailabilityWindowManager({
  badgeDefinitionId,
  visible,
  onPrepareBadge,
  onCombinedSaveComplete,
}: AvailabilityWindowManagerProps) {
  const theme = useTheme();
  const windows = useQuery(
    api.adminBadgeAvailability.getAvailabilityWindowsForAdmin,
    visible && badgeDefinitionId !== null
      ? { badgeDefinitionId }
      : 'skip',
  );
  const createWindow = useMutation(
    api.adminBadgeAvailability.createAvailabilityWindow,
  );
  const updateWindow = useMutation(
    api.adminBadgeAvailability.updateAvailabilityWindow,
  );
  const deleteWindow = useMutation(
    api.adminBadgeAvailability.deleteAvailabilityWindow,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingWindowId, setEditingWindowId] =
    useState<Id<'badgeAvailabilityWindows'> | null>(null);
  const [form, setForm] = useState<WindowFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<Id<'badgeAvailabilityWindows'> | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] =
    useState<Id<'badgeAvailabilityWindows'> | null>(null);
  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (visible && badgeDefinitionId === null) {
      setFormOpen(true);
    }
  }, [badgeDefinitionId, visible]);

  const closeForm = () => {
    if (badgeDefinitionId !== null) {
      setFormOpen(false);
    }
    setEditingWindowId(null);
    setForm(emptyForm);
  };

  const openCreateForm = () => {
    setEditingWindowId(null);
    setForm(emptyForm);
    setStatusMessage(null);
    setFormOpen(true);
  };

  const openEditForm = (window: AvailabilityWindow) => {
    setEditingWindowId(window._id);
    setForm({
      key: window.key,
      startsAt: formatLocalDateTimeInput(window.startsAt),
      endsAt: formatLocalDateTimeInput(window.endsAt),
    });
    setStatusMessage(null);
    setConfirmingDeleteId(null);
    setFormOpen(true);
  };

  const updateField = (
    field: keyof WindowFormState,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage(null);
  };

  const validateForm = (): ValidatedWindowInput => {
    const key = normalizeWindowKey(form.key);
    const startsAt = parseLocalDateTime(form.startsAt);
    const endsAt = parseLocalDateTime(form.endsAt);

    if (key.length === 0) {
      return {
        ok: false,
        message: 'Enter an event period title.',
      };
    }

    if (!slugPattern.test(key)) {
      return {
        ok: false,
        message:
          'Window key must use lowercase letters, numbers, and single hyphens only.',
      };
    }

    if (startsAt === null || endsAt === null) {
      return {
        ok: false,
        message:
          'Enter both dates in YYYY-MM-DD HH:MM format using local time.',
      };
    }

    if (startsAt <= Date.now()) {
      return {
        ok: false,
        message: 'The window must start in the future.',
      };
    }

    if (startsAt >= endsAt) {
      return {
        ok: false,
        message: 'The window end must be later than its start.',
      };
    }

    return { ok: true, key, startsAt, endsAt };
  };

  const submitForm = async () => {
    if (saving) {
      return;
    }

    const validated = validateForm();

    if (!validated.ok) {
      setStatusMessage(validated.message);
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const combinedSave = badgeDefinitionId === null;
      let targetBadgeDefinitionId = badgeDefinitionId;

      if (targetBadgeDefinitionId === null) {
        targetBadgeDefinitionId = await onPrepareBadge();

        if (targetBadgeDefinitionId === null) {
          return;
        }
      }

      if (editingWindowId === null) {
        await createWindow({
          badgeDefinitionId: targetBadgeDefinitionId,
          key: validated.key,
          startsAt: validated.startsAt,
          endsAt: validated.endsAt,
        });

        if (combinedSave) {
          onCombinedSaveComplete();
          return;
        }

        setStatusMessage('Availability window added.');
      } else {
        await updateWindow({
          availabilityWindowId: editingWindowId,
          key: validated.key,
          startsAt: validated.startsAt,
          endsAt: validated.endsAt,
        });
        setStatusMessage('Availability window updated.');
      }

      closeForm();
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          editingWindowId === null
            ? 'Unable to add this availability window.'
            : 'Unable to update this availability window.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (
    availabilityWindowId: Id<'badgeAvailabilityWindows'>,
  ) => {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(availabilityWindowId);
    setStatusMessage(null);

    try {
      await deleteWindow({ availabilityWindowId });
      setStatusMessage('Future availability window removed.');

      if (editingWindowId === availabilityWindowId) {
        closeForm();
      }
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          'Unable to remove this availability window.',
        ),
      );
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  if (!visible) {
    return null;
  }

  const awaitingBadgeSave = badgeDefinitionId === null;
  const now = Date.now();
  const busy = saving || deletingId !== null;
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      borderColor: theme.textSecondary,
      color: theme.text,
    },
  ];

  return (
    <ThemedView
      accessibilityLabel="Seasonal availability windows"
      type="backgroundElement"
      style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headingCopy}>
          <ThemedText type="smallBold">
            Seasonal availability
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {awaitingBadgeSave
              ? 'Fill in the first window, then save the badge and window together below.'
              : 'With no windows, this badge remains available year-round. Once a window starts, it is locked to preserve progress history.'}
          </ThemedText>
        </ThemedView>

        {!formOpen && badgeDefinitionId !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add availability window"
            accessibilityHint="Schedule a future period when this badge can make progress."
            disabled={busy}
            onPress={openCreateForm}
            style={[
              styles.primaryButton,
              busy && styles.disabled,
            ]}>
            <ThemedText style={styles.primaryButtonText}>
              Add availability window
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.status}>
          {statusMessage}
        </ThemedText>
      ) : null}

      {formOpen ? (
        <ThemedView style={styles.form}>
          <ThemedText type="smallBold">
            {editingWindowId === null
              ? 'Add availability window'
              : 'Edit future availability window'}
          </ThemedText>

          {awaitingBadgeSave ? (
            <ThemedText type="small" themeColor="textSecondary">
              This first window will be saved with the badge.
            </ThemedText>
          ) : null}

          <ThemedText type="smallBold">
            Event period title
          </ThemedText>

          <TextInput
            accessibilityLabel="Event period title"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            onChangeText={(value) => updateField('key', value)}
            placeholder="Example: Halloween 2027"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={form.key}
          />

          <ThemedText type="smallBold">
            Start time (local)
          </ThemedText>
          <ThemedText type="small">
            Format: YYYY-MM-DD HH:MM
          </ThemedText>

          <TextInput
            accessibilityLabel="Availability window start"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            onChangeText={(value) =>
              updateField('startsAt', value)
            }
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={form.startsAt}
          />

          <ThemedText type="smallBold">
            End time (local)
          </ThemedText>
          <ThemedText type="small">
            Format: YYYY-MM-DD HH:MM
          </ThemedText>

          <TextInput
            accessibilityLabel="Availability window end"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            onChangeText={(value) => updateField('endsAt', value)}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={form.endsAt}
          />

          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: saving,
                disabled: busy,
              }}
              disabled={busy}
              onPress={submitForm}
              style={[
                styles.primaryButton,
                busy && styles.disabled,
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                {awaitingBadgeSave
                  ? 'Save badge and add window'
                  : saving
                    ? 'Saving...'
                    : editingWindowId === null
                      ? 'Add window'
                      : 'Save window'}
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={closeForm}
              style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                {awaitingBadgeSave ? 'Clear window' : 'Cancel'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}

      {badgeDefinitionId === null ? null : windows === undefined ? (
        <ActivityIndicator
          accessibilityLabel="Loading availability windows"
          accessibilityRole="progressbar"
        />
      ) : windows.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No availability windows are scheduled. This badge is
          currently available year-round.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {windows.map((window) => {
            const state = getWindowState(window, now);
            const locked = window.startsAt <= now;
            const confirmingDelete =
              confirmingDeleteId === window._id;

            return (
              <ThemedView key={window._id} style={styles.windowCard}>
                <ThemedView style={styles.windowHeading}>
                  <ThemedText type="smallBold">
                    {window.key}
                  </ThemedText>
                  <ThemedText
                    type="smallBold"
                    themeColor="textSecondary">
                    {state}
                  </ThemedText>
                </ThemedView>

                <ThemedText type="small">
                  Starts: {formatDisplayDate(window.startsAt)}
                </ThemedText>
                <ThemedText type="small">
                  Ends: {formatDisplayDate(window.endsAt)}
                </ThemedText>

                {locked ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Locked because this window has started.
                  </ThemedText>
                ) : (
                  <ThemedView style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${window.key}`}
                      disabled={busy}
                      onPress={() => openEditForm(window)}
                      style={styles.secondaryButton}>
                      <ThemedText style={styles.secondaryButtonText}>
                        Edit
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${window.key}`}
                      disabled={busy}
                      onPress={() =>
                        setConfirmingDeleteId(window._id)
                      }
                      style={styles.secondaryButton}>
                      <ThemedText style={styles.secondaryButtonText}>
                        Remove
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                )}

                {confirmingDelete ? (
                  <ThemedView style={styles.confirmation}>
                    <ThemedText accessibilityLiveRegion="polite">
                      Remove this future window? The badge will follow
                      its remaining windows. With none, it will be
                      available year-round.
                    </ThemedText>

                    <ThemedView style={styles.actions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          busy: deletingId === window._id,
                          disabled: busy,
                        }}
                        disabled={busy}
                        onPress={() => confirmDelete(window._id)}
                        style={[
                          styles.dangerButton,
                          busy && styles.disabled,
                        ]}>
                        <ThemedText style={styles.primaryButtonText}>
                          {deletingId === window._id
                            ? 'Removing...'
                            : 'Confirm removal'}
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => setConfirmingDeleteId(null)}
                        style={styles.secondaryButton}>
                        <ThemedText style={styles.secondaryButtonText}>
                          Cancel
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  </ThemedView>
                ) : null}
              </ThemedView>
            );
          })}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headingCopy: {
    flex: 1,
    minWidth: 240,
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  windowCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: Spacing.two,
  },
  windowHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#A51C30',
  },
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#B42318',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#E0E1E6',
  },
  secondaryButtonText: {
    color: '#111111',
    textAlign: 'center',
  },
  confirmation: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  status: {
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.6,
  },
});
