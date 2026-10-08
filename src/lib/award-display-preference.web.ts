export type AwardDisplayMode = 'full_screen' | 'banner';

const preferenceKey = 'tuna-bassoon-award-display-mode';

export async function loadAwardDisplayMode(): Promise<AwardDisplayMode> {
  try {
    return window.localStorage.getItem(preferenceKey) === 'banner'
      ? 'banner'
      : 'full_screen';
  } catch {
    return 'full_screen';
  }
}

export async function saveAwardDisplayMode(
  mode: AwardDisplayMode,
): Promise<void> {
  window.localStorage.setItem(preferenceKey, mode);
}
