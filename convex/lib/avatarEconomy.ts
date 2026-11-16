export const CHECK_IN_LORCOIN_REWARD = 5;
export const BADGE_LORCOIN_REWARD = 50;
export const AVATAR_ITEM_LORCOIN_PRICE = 100;

export const purchasableAvatarItemIds = [
  'brown_tee',
  'purple_tee',
  'crimson_tee',
  'pink_tee',
  'black_tee',
  'fire_tee',
  'noah_kahan_tee',
  'pink_gown_top',
  'classic_pants',
  'grey_pants',
  'brown_pants',
  'purple_pants',
  'pink_gown_bottom',
  'pink_heels',
  'glasses',
  'beanie',
  'beanie_blue',
  'beanie_green',
  'beanie_pink',
  'beanie_purple',
  'beanie_red',
  'cowboy_hat',
  'cowboy_hat_brown',
  'cowboy_hat_red',
  'princess_crown',
  'heart_wand',
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
