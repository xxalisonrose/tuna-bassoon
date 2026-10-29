import type { ImageStyle } from 'react-native';

export type AvatarFit = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
};

export type AvatarFitOverrides = Partial<Record<string, Partial<AvatarFit>>>;

export const avatarItemFits: Readonly<Record<string, AvatarFit>> = {
  explorer_field: {
    left: 3.6,
    top: -0.6,
    width: 93,
    height: 98,
    rotation: 0,
  },
  new_explorer_tee: {
    left: -2.5,
    top: -2.9,
    width: 105,
    height: 108,
    rotation: 0,
  },
  explorer_cargo: {
    left: 19.5,
    top: 19,
    width: 63,
    height: 63,
    rotation: 0,
  },
  rust_neckerchief: {
    left: 20,
    top: 9,
    width: 60,
    height: 60,
    rotation: 0,
  },
  winter_polka_sweater: {
    left: 13.6,
    top: -1.7,
    width: 73,
    height: 78,
    rotation: 0,
  },
  winter_charcoal_pants: {
    left: 23,
    top: 40,
    width: 54,
    height: 56,
    rotation: 0,
  },
  winter_snow_boots: {
    left: 35,
    top: 70,
    width: 30,
    height: 30,
    rotation: 0,
  },
  winter_cream_scarf: {
    left: 39,
    top: 14,
    width: 22,
    height: 22,
    rotation: 0,
  },
  winter_knit_beanie: {
    left: 41,
    top: -4,
    width: 18,
    height: 16,
    rotation: 0,
  },
  cowboy_sheriff_shirt: {
    left: 30.8,
    top: 6.3,
    width: 38,
    height: 50,
    rotation: 0,
  },
  cowboy_western_pants: {
    left: 23,
    top: 40,
    width: 54,
    height: 56,
    rotation: 0,
  },
  cowboy_western_shorts: {
    left: 31,
    top: 44,
    width: 38,
    height: 26,
    rotation: 0,
  },
  cowboy_brown_boots: {
    left: 35,
    top: 70,
    width: 30,
    height: 30,
    rotation: 0,
  },
  cowboy_red_boots: {
    left: 35,
    top: 70,
    width: 30,
    height: 30,
    rotation: 0,
  },
  cowboy_red_bandana: {
    left: 40,
    top: 18,
    width: 20,
    height: 15,
    rotation: 0,
  },
  cowboy_sheriff_hat: {
    left: 36,
    top: -5,
    width: 28,
    height: 20,
    rotation: 0,
  },
  princess_puff_bodice: {
    left: 29.8,
    top: 11.3,
    width: 40,
    height: 47,
    rotation: 0,
  },
  princess_ballgown_skirt: {
    left: 18,
    top: 41,
    width: 64,
    height: 61,
    rotation: 0,
  },
  princess_crown: {
    left: 44,
    top: -2,
    width: 12,
    height: 11,
    rotation: 0,
  },
  princess_star_wand: {
    left: 55,
    top: 26,
    width: 29,
    height: 50,
    rotation: 0,
  },
};

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
