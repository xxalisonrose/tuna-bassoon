import type { ImageStyle } from 'react-native';

import { avatarItemOptions } from '@/lib/avatar';

export type AvatarFit = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
};

export type AvatarFitOverrides = Partial<Record<string, Partial<AvatarFit>>>;

export const fullCanvasAvatarFit: AvatarFit = Object.freeze({
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  rotation: 0,
});

const visibleItemIds = Object.values(avatarItemOptions)
  .flat()
  .map((item) => item.id)
  .filter((itemId) => itemId !== 'none' && itemId !== 'bare_hooves');

/**
 * All production art uses the same 1254 x 1254 canvas. The editor starts every
 * item at an identical full-canvas fit and stores only deliberate exceptions.
 */
export const avatarItemFits: Readonly<Record<string, AvatarFit>> =
  Object.fromEntries(
    visibleItemIds.map((itemId) => [itemId, fullCanvasAvatarFit]),
  );

export const adjustableAvatarItemIds = Object.freeze(
  Object.keys(avatarItemFits),
);

export function getAvatarItemFit(
  itemId: string,
  overrides?: AvatarFitOverrides,
): AvatarFit | undefined {
  const defaultFit = avatarItemFits[itemId];

  if (!defaultFit) {
    return undefined;
  }

  return {
    ...defaultFit,
    ...overrides?.[itemId],
  };
}

export function getAvatarItemFitStyle(
  itemId: string,
  overrides?: AvatarFitOverrides,
): ImageStyle | undefined {
  const fit = getAvatarItemFit(itemId, overrides);

  if (!fit) {
    return undefined;
  }

  return {
    height: `${fit.height}%`,
    left: `${fit.left}%`,
    top: `${fit.top}%`,
    transform: [{ rotate: `${fit.rotation}deg` }],
    width: `${fit.width}%`,
  };
}
