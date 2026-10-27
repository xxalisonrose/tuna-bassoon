export const CHECK_IN_LORCOIN_REWARD = 5;
export const BADGE_LORCOIN_REWARD = 50;
export const AVATAR_ITEM_LORCOIN_PRICE = 100;

export const purchasableAvatarItemIds = [
  'winter_polka_sweater',
  'winter_charcoal_pants',
  'winter_snow_boots',
  'winter_cream_scarf',
  'winter_knit_beanie',
  'cowboy_sheriff_shirt',
  'cowboy_western_pants',
  'cowboy_western_shorts',
  'cowboy_brown_boots',
  'cowboy_red_boots',
  'cowboy_red_bandana',
  'cowboy_sheriff_hat',
  'princess_puff_bodice',
  'princess_ballgown_skirt',
  'princess_crown',
  'princess_star_wand',
] as const;

export type PurchasableAvatarItemId = (typeof purchasableAvatarItemIds)[number];

export function isPurchasableAvatarItemId(
  itemId: string,
): itemId is PurchasableAvatarItemId {
  return purchasableAvatarItemIds.includes(itemId as PurchasableAvatarItemId);
}

export function getStoredAvatarItemIds(profile: {
  avatarTopId?: string;
  avatarBottomId?: string;
  avatarShoesId?: string;
  avatarNeckId?: string;
  avatarFaceId?: string;
  avatarHeadwearId?: string;
  avatarHandheldId?: string;
}) {
  return [
    profile.avatarTopId,
    profile.avatarBottomId,
    profile.avatarShoesId,
    profile.avatarNeckId,
    profile.avatarFaceId,
    profile.avatarHeadwearId,
    profile.avatarHandheldId,
  ].filter((itemId): itemId is string => itemId !== undefined);
}
