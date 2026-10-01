import * as DocumentPicker from 'expo-document-picker';

import type { BadgeArtworkPickerResult } from './badge-artwork-picker.types';

export const badgeArtworkUploadsSupported = true;

export async function pickBadgeArtwork(): Promise<BadgeArtworkPickerResult> {
  const result = await DocumentPicker.getDocumentAsync({
    base64: false,
    copyToCacheDirectory: true,
    multiple: false,
    type: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (result.canceled) {
    return { canceled: true };
  }

  const asset = result.assets[0];

  if (asset === undefined) {
    return { canceled: true };
  }

  return { canceled: false, asset };
}
