import type { BadgeArtworkPickerResult } from './badge-artwork-picker.types';

export const badgeArtworkUploadsSupported = false;

export async function pickBadgeArtwork(): Promise<BadgeArtworkPickerResult> {
  return { canceled: true };
}
