import * as SecureStore from 'expo-secure-store';

export type AwardDisplayMode = 'full_screen' | 'banner';

const preferenceKey = 'tuna-bassoon-award-display-mode';

export async function loadAwardDisplayMode(): Promise<AwardDisplayMode> {
  try {
    const value = await SecureStore.getItemAsync(preferenceKey);
    return value === 'banner' ? 'banner' : 'full_screen';
  } catch {
    return 'full_screen';
  }
}

export async function saveAwardDisplayMode(
  mode: AwardDisplayMode,
): Promise<void> {
  await SecureStore.setItemAsync(preferenceKey, mode);
}
