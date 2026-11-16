export const avatarPresetIds = ['standard', 'pretty_pretty_princess'] as const;

export type AvatarPresetId = (typeof avatarPresetIds)[number];

export const avatarTopIds = [
  'white_tee',
  'brown_tee',
  'color_splash_tee',
  'purple_tee',
  'crimson_tee',
  'pink_tee',
  'black_tee',
  'fire_tee',
  'noah_kahan_tee',
  'beta_tester_tee',
  'pink_gown_top',
] as const;
export const avatarBottomIds = [
  'classic_pants',
  'blue_pants',
  'grey_pants',
  'brown_pants',
  'purple_pants',
  'pink_gown_bottom',
] as const;
export const avatarShoesIds = [
  'bare_hooves',
  'scout_boots',
  'pink_heels',
] as const;
export const avatarNeckIds = ['none'] as const;
export const avatarFaceIds = ['none', 'goggles', 'glasses'] as const;
export const avatarHeadwearIds = [
  'none',
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
] as const;
export const avatarHandheldIds = ['none', 'heart_wand'] as const;

export type AvatarTopId = (typeof avatarTopIds)[number];
export type AvatarBottomId = (typeof avatarBottomIds)[number];
export type AvatarShoesId = (typeof avatarShoesIds)[number];
export type AvatarNeckId = (typeof avatarNeckIds)[number];
export type AvatarFaceId = (typeof avatarFaceIds)[number];
export type AvatarHeadwearId = (typeof avatarHeadwearIds)[number];
export type AvatarHandheldId = (typeof avatarHandheldIds)[number];

export type AvatarSelection = {
  topId: AvatarTopId;
  bottomId: AvatarBottomId;
  shoesId: AvatarShoesId;
  neckId: AvatarNeckId;
  faceId: AvatarFaceId;
  headwearId: AvatarHeadwearId;
  handheldId: AvatarHandheldId;
};

export type AvatarItemSlot =
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'neck'
  | 'face'
  | 'headwear'
  | 'handheld';

export type AvatarCategoryId = 'outfits' | AvatarItemSlot;

export type AvatarPreset = {
  id: AvatarPresetId;
  name: string;
  description: string;
  accessibilityLabel: string;
  selection: AvatarSelection;
};

export type AvatarItemOption = {
  id: string;
  name: string;
  description: string;
  price?: number;
  unlockMissionKey?: string;
  unlockMessage?: string;
};

export const standardAvatarSelection: AvatarSelection = {
  topId: 'white_tee',
  bottomId: 'blue_pants',
  shoesId: 'scout_boots',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'none',
  handheldId: 'none',
};

export const prettyPrettyPrincessSelection: AvatarSelection = {
  topId: 'pink_gown_top',
  bottomId: 'pink_gown_bottom',
  shoesId: 'pink_heels',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'princess_crown',
  handheldId: 'heart_wand',
};

// Retain the export name used by the editor while the old themed presets are removed.
export const trailBasicsSelection = standardAvatarSelection;
export const defaultAvatarPresetId: AvatarPresetId = 'standard';
export const defaultAvatarSelection = standardAvatarSelection;

export const avatarPresets: readonly AvatarPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'White tee, blue pants, and Scout’s boots.',
    accessibilityLabel: 'Scout wearing a white tee, blue pants, and boots.',
    selection: standardAvatarSelection,
  },
  {
    id: 'pretty_pretty_princess',
    name: 'Pretty Pretty Princess',
    description: 'Pink lace gown, crown, heels, and heart wand.',
    accessibilityLabel:
      'Scout wearing a pink lace princess gown, crown, heels, and carrying a heart wand.',
    selection: prettyPrettyPrincessSelection,
  },
] as const;

export const avatarCategories: readonly {
  id: AvatarCategoryId;
  label: string;
}[] = [
  { id: 'outfits', label: 'Complete Looks' },
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Pants' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'face', label: 'Glasses & Goggles' },
  { id: 'headwear', label: 'Hats & Crowns' },
  { id: 'handheld', label: 'Accessories' },
];

export const avatarItemLorcoinPrice = 100;

export const avatarItemOptions: Record<
  AvatarItemSlot,
  readonly AvatarItemOption[]
> = {
  top: [
    {
      id: 'white_tee',
      name: 'White Tee',
      description: 'Scout’s standard white shirt.',
    },
    {
      id: 'brown_tee',
      name: 'Brown Tee',
      description: 'A warm brown everyday shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'color_splash_tee',
      name: 'Color Splash Tee',
      description: 'A colorful everyday shirt.',
    },
    {
      id: 'beta_tester_tee',
      name: 'Beta Tester Tee',
      description: 'A special shirt awarded for completing the tutorial.',
      unlockMissionKey: 'welcome-to-lorcal',
      unlockMessage: 'Complete the Welcome to Lorcal mission.',
    },
    {
      id: 'purple_tee',
      name: 'Purple Tee',
      description: 'A rich purple shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'crimson_tee',
      name: 'Crimson Tee',
      description: 'A bold crimson shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'pink_tee',
      name: 'Pink Tee',
      description: 'A bright pink shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'black_tee',
      name: 'Black Tee',
      description: 'A classic black shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'fire_tee',
      name: 'Fire Tee',
      description: 'A graphic shirt ready for fitting in the clothing editor.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'noah_kahan_tee',
      name: 'Noah Kahan Tee',
      description: 'A music-inspired graphic shirt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'pink_gown_top',
      name: 'Princess Gown Top',
      description: 'The lace bodice and puff sleeves for the princess gown.',
      price: avatarItemLorcoinPrice,
    },
  ],
  bottom: [
    {
      id: 'classic_pants',
      name: 'Classic Pants',
      description: 'Scout’s simple everyday pants.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'blue_pants',
      name: 'Blue Pants',
      description: 'Scout’s standard blue pants.',
    },
    {
      id: 'grey_pants',
      name: 'Grey Pants',
      description: 'Neutral grey pants.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'brown_pants',
      name: 'Brown Pants',
      description: 'Earthy brown pants.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'purple_pants',
      name: 'Purple Pants',
      description: 'Bright purple pants.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'pink_gown_bottom',
      name: 'Princess Gown Skirt',
      description: 'The sweeping pink lace skirt for the princess gown.',
      price: avatarItemLorcoinPrice,
    },
  ],
  shoes: [
    {
      id: 'bare_hooves',
      name: 'Bare Hooves',
      description: 'No shoes selected.',
    },
    {
      id: 'scout_boots',
      name: 'Scout’s Boots',
      description: 'Scout’s standard adventure boots.',
    },
    {
      id: 'pink_heels',
      name: 'Pink Heels',
      description: 'Pink princess heels drawn to fit Scout.',
      price: avatarItemLorcoinPrice,
    },
  ],
  neck: [
    {
      id: 'none',
      name: 'No Neck Accessory',
      description: 'No neck accessory selected.',
    },
  ],
  face: [
    {
      id: 'none',
      name: 'No Glasses',
      description: 'Keep Scout’s face clear.',
    },
    {
      id: 'goggles',
      name: 'Goggles',
      description: 'Adventure goggles drawn to align with Scout.',
    },
    {
      id: 'glasses',
      name: 'Glasses',
      description: 'Everyday glasses drawn to align with Scout.',
      price: avatarItemLorcoinPrice,
    },
  ],
  headwear: [
    {
      id: 'none',
      name: 'No Hat',
      description: 'Keep Scout’s horns and hair uncovered.',
    },
    {
      id: 'beanie',
      name: 'Beanie',
      description: 'Scout’s original beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'beanie_blue',
      name: 'Blue Beanie',
      description: 'A bright blue beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'beanie_green',
      name: 'Green Beanie',
      description: 'A bright green beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'beanie_pink',
      name: 'Pink Beanie',
      description: 'A bright pink beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'beanie_purple',
      name: 'Purple Beanie',
      description: 'A bright purple beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'beanie_red',
      name: 'Red Beanie',
      description: 'A bright red beanie.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_hat',
      name: 'Cowboy Hat',
      description: 'A classic cowboy hat.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_hat_brown',
      name: 'Brown Cowboy Hat',
      description: 'A warm brown cowboy hat.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_hat_red',
      name: 'Red Cowboy Hat',
      description: 'A bold red cowboy hat.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'princess_crown',
      name: 'Princess Crown',
      description: 'A golden crown topped with a red heart.',
      price: avatarItemLorcoinPrice,
    },
  ],
  handheld: [
    {
      id: 'none',
      name: 'No Handheld Item',
      description: 'No handheld item selected.',
    },
    {
      id: 'heart_wand',
      name: 'Heart Wand',
      description: 'A heart-tipped wand for the princess look.',
      price: avatarItemLorcoinPrice,
    },
  ],
};

export function getAvatarItemPrice(itemId: string) {
  for (const options of Object.values(avatarItemOptions)) {
    const item = options.find((option) => option.id === itemId);

    if (item?.price !== undefined) {
      return item.price;
    }
  }

  return 0;
}

export function normalizeAvatarPresetId(
  value: string | undefined,
): AvatarPresetId {
  return avatarPresetIds.includes(value as AvatarPresetId)
    ? (value as AvatarPresetId)
    : defaultAvatarPresetId;
}

export function getAvatarPreset(value: string | undefined) {
  const normalizedValue = normalizeAvatarPresetId(value);

  return (
    avatarPresets.find((preset) => preset.id === normalizedValue) ??
    avatarPresets[0]
  );
}

export function getAvatarPresetSelection(
  value: string | undefined,
): AvatarSelection {
  return { ...getAvatarPreset(value).selection };
}

function normalizeValue<T extends string>(
  value: string | undefined,
  validValues: readonly T[],
  fallback: T,
) {
  return validValues.includes(value as T) ? (value as T) : fallback;
}

export function normalizeAvatarSelection(
  value: Partial<AvatarSelection> | undefined,
  presetId?: string,
): AvatarSelection {
  const fallback = getAvatarPresetSelection(presetId);

  return {
    topId: normalizeValue(value?.topId, avatarTopIds, fallback.topId),
    bottomId: normalizeValue(
      value?.bottomId,
      avatarBottomIds,
      fallback.bottomId,
    ),
    shoesId: normalizeValue(value?.shoesId, avatarShoesIds, fallback.shoesId),
    neckId: 'none',
    faceId: normalizeValue(value?.faceId, avatarFaceIds, fallback.faceId),
    headwearId: normalizeValue(
      value?.headwearId,
      avatarHeadwearIds,
      fallback.headwearId,
    ),
    handheldId: normalizeValue(
      value?.handheldId,
      avatarHandheldIds,
      fallback.handheldId,
    ),
  };
}

export function applyAvatarItem(
  selection: AvatarSelection,
  slot: AvatarItemSlot,
  itemId: string,
): AvatarSelection {
  switch (slot) {
    case 'top':
      return {
        ...selection,
        topId: normalizeValue(itemId, avatarTopIds, selection.topId),
      };
    case 'bottom':
      return {
        ...selection,
        bottomId: normalizeValue(itemId, avatarBottomIds, selection.bottomId),
      };
    case 'shoes':
      return {
        ...selection,
        shoesId: normalizeValue(itemId, avatarShoesIds, selection.shoesId),
      };
    case 'neck':
      return { ...selection, neckId: 'none' };
    case 'face':
      return {
        ...selection,
        faceId: normalizeValue(itemId, avatarFaceIds, selection.faceId),
      };
    case 'headwear':
      return {
        ...selection,
        headwearId: normalizeValue(
          itemId,
          avatarHeadwearIds,
          selection.headwearId,
        ),
      };
    case 'handheld':
      return {
        ...selection,
        handheldId: normalizeValue(
          itemId,
          avatarHandheldIds,
          selection.handheldId,
        ),
      };
  }
}

export function getAvatarSlotValue(
  selection: AvatarSelection,
  slot: AvatarItemSlot,
) {
  switch (slot) {
    case 'top':
      return selection.topId;
    case 'bottom':
      return selection.bottomId;
    case 'shoes':
      return selection.shoesId;
    case 'neck':
      return selection.neckId;
    case 'face':
      return selection.faceId;
    case 'headwear':
      return selection.headwearId;
    case 'handheld':
      return selection.handheldId;
  }
}

export function getMatchingAvatarPresetId(
  selection: AvatarSelection,
): AvatarPresetId | 'custom' {
  const matchingPreset = avatarPresets.find((preset) =>
    Object.entries(preset.selection).every(
      ([key, value]) => selection[key as keyof AvatarSelection] === value,
    ),
  );

  return matchingPreset?.id ?? 'custom';
}
