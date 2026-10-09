export type FormUndoShortcutsOptions = {
  enabled: boolean;
  onUndo: () => boolean;
  onRedo: () => boolean;
};

export function useFormUndoShortcuts(
  _options: FormUndoShortcutsOptions,
) {}
