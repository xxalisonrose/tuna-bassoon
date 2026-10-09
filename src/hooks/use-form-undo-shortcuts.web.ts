import { useEffect } from 'react';

import type { FormUndoShortcutsOptions } from './use-form-undo-shortcuts';

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable ||
    target.closest('input, textarea, [contenteditable="true"]') !== null;
}

export function useFormUndoShortcuts({
  enabled,
  onUndo,
  onRedo,
}: FormUndoShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        (!event.metaKey && !event.ctrlKey) ||
        isTextEditingTarget(event.target)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const isRedo =
        (key === 'z' && event.shiftKey) ||
        (key === 'y' && !event.shiftKey);
      const isUndo = key === 'z' && !event.shiftKey;

      if (isUndo && onUndo()) {
        event.preventDefault();
      } else if (isRedo && onRedo()) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onRedo, onUndo]);
}
