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
    left: 9.1,
    top: 0.2,
    width: 81.7,
    height: 97.2,
    rotation: 0,
  },
  new_explorer_tee: {
    left: -2.9,
    top: -2.9,
    width: 105.4,
    height: 111.7,
    rotation: 0,
  },
  explorer_cargo: {
    left: 21,
    top: 19,
    width: 58.4,
    height: 63,
    rotation: 0,
  },
  explorer_boots: {
    left: 6,
    top: 17,
    width: 88,
    height: 88,
    rotation: 0,
  },
  rust_neckerchief: {
    left: 19.6,
    top: 9.2,
    width: 60,
    height: 60,
    rotation: 0,
  },
  winter_polka_sweater: {
    left: 13,
    top: -0.4,
    width: 74,
    height: 76.7,
    rotation: 0,
  },
  winter_charcoal_pants: {
    left: 24.8,
    top: 36.2,
    width: 50.2,
    height: 59.8,
    rotation: 0,
  },
  winter_snow_boots: {
    left: 32.7,
    top: 70.4,
    width: 34.1,
    height: 29.2,
    rotation: 0,
  },
  winter_cream_scarf: {
    left: 39,
    top: 15.9,
    width: 22,
    height: 22,
    rotation: 0,
  },
  winter_knit_beanie: {
    left: 42.7,
    top: -1.3,
    width: 13.4,
    height: 12.7,
    rotation: 0,
  },
  cowboy_sheriff_shirt: {
    left: 30.6,
    top: 10.7,
    width: 38.7,
    height: 42.7,
    rotation: 0,
  },
  cowboy_western_pants: {
    left: 18.7,
    top: 37.7,
    width: 62.1,
    height: 60.6,
    rotation: 0,
  },
  cowboy_western_shorts: {
    left: 33.1,
    top: 31.9,
    width: 33.4,
    height: 42.3,
    rotation: 0,
  },
  cowboy_brown_boots: {
    left: 30.2,
    top: 70.2,
    width: 39.6,
    height: 30,
    rotation: 0,
  },
  cowboy_red_boots: {
    left: 29.4,
    top: 70.2,
    width: 40,
    height: 30,
    rotation: 0,
  },
  cowboy_red_bandana: {
    left: 37.1,
    top: 13.9,
    width: 24.6,
    height: 18.5,
    rotation: 0,
  },
  cowboy_sheriff_hat: {
    left: 38.3,
    top: -5,
    width: 23,
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
    left: 17.6,
    top: 32.7,
    width: 64,
    height: 61,
    rotation: 0,
  },
  princess_crown: {
    left: 43.2,
    top: -0.1,
    width: 12,
    height: 11,
    rotation: 0,
  },
  princess_star_wand: {
    left: 57.9,
    top: 38.8,
    width: 22.1,
    height: 26.2,
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
