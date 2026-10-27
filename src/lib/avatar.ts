export const avatarPresetIds = [
  'explorer',
  'trail_basics',
  'cozy_winter',
  'classic_cowboy',
  'rodeo_cowboy',
  'pink_princess',
] as const;

export type AvatarPresetId = (typeof avatarPresetIds)[number];

export const avatarTopIds = [
  'trail_tank',
  'explorer_field',
  'new_explorer_tee',
  'winter_polka_sweater',
  'cowboy_sheriff_shirt',
  'princess_puff_bodice',
] as const;
export const avatarBottomIds = [
  'trail_shorts',
  'explorer_cargo',
  'winter_charcoal_pants',
  'cowboy_western_pants',
  'cowboy_western_shorts',
  'princess_ballgown_skirt',
] as const;
export const avatarShoesIds = [
  'bare_hooves',
  'explorer_boots',
  'winter_snow_boots',
  'cowboy_brown_boots',
  'cowboy_red_boots',
] as const;
export const avatarNeckIds = [
  'none',
  'rust_neckerchief',
  'winter_cream_scarf',
  'cowboy_red_bandana',
] as const;
export const avatarFaceIds = ['none', 'explorer_goggles'] as const;
export const avatarHeadwearIds = [
  'none',
  'winter_knit_beanie',
  'cowboy_sheriff_hat',
  'princess_crown',
] as const;
export const avatarHandheldIds = ['none', 'princess_star_wand'] as const;

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
  'top' | 'bottom' | 'shoes' | 'neck' | 'face' | 'headwear' | 'handheld';

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

export const trailBasicsSelection: AvatarSelection = {
  topId: 'trail_tank',
  bottomId: 'trail_shorts',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'none',
  handheldId: 'none',
};

export const explorerSelection: AvatarSelection = {
  topId: 'explorer_field',
  bottomId: 'explorer_cargo',
  shoesId: 'explorer_boots',
  neckId: 'rust_neckerchief',
  faceId: 'explorer_goggles',
  headwearId: 'none',
  handheldId: 'none',
};

export const cozyWinterSelection: AvatarSelection = {
  topId: 'winter_polka_sweater',
  bottomId: 'winter_charcoal_pants',
  shoesId: 'winter_snow_boots',
  neckId: 'winter_cream_scarf',
  faceId: 'none',
  headwearId: 'winter_knit_beanie',
  handheldId: 'none',
};

export const classicCowboySelection: AvatarSelection = {
  topId: 'cowboy_sheriff_shirt',
  bottomId: 'cowboy_western_pants',
  shoesId: 'cowboy_brown_boots',
  neckId: 'cowboy_red_bandana',
  faceId: 'none',
  headwearId: 'cowboy_sheriff_hat',
  handheldId: 'none',
};

export const rodeoCowboySelection: AvatarSelection = {
  topId: 'cowboy_sheriff_shirt',
  bottomId: 'cowboy_western_shorts',
  shoesId: 'cowboy_red_boots',
  neckId: 'cowboy_red_bandana',
  faceId: 'none',
  headwearId: 'cowboy_sheriff_hat',
  handheldId: 'none',
};

export const pinkPrincessSelection: AvatarSelection = {
  topId: 'princess_puff_bodice',
  bottomId: 'princess_ballgown_skirt',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'princess_crown',
  handheldId: 'princess_star_wand',
};

export const defaultAvatarPresetId: AvatarPresetId = 'explorer';
export const defaultAvatarSelection = explorerSelection;

export const avatarPresets: readonly AvatarPreset[] = [
  {
    id: 'explorer',
    name: 'Traditional Explorer',
    description:
      'Field shirt, utility vest, cargo shorts, boots, neckerchief, and goggles.',
    accessibilityLabel:
      'Cow avatar wearing the complete traditional explorer outfit.',
    selection: explorerSelection,
  },
  {
    id: 'trail_basics',
    name: 'Trail Basics',
    description:
      'A cream trail tank, neutral shorts, bare hooves, and no accessories.',
    accessibilityLabel:
      'Cow avatar wearing a cream trail tank and neutral shorts.',
    selection: trailBasicsSelection,
  },
  {
    id: 'cozy_winter',
    name: 'Cozy Winter',
    description:
      'Polka-dot sweater, charcoal pants, snow boots, cream scarf, and a knit beanie.',
    accessibilityLabel: 'Cow avatar wearing the complete cozy winter outfit.',
    selection: cozyWinterSelection,
  },
  {
    id: 'classic_cowboy',
    name: 'Classic Cowboy',
    description:
      'Sheriff shirt and vest, long western pants, brown boots, red bandana, and sheriff hat.',
    accessibilityLabel: 'Cow avatar wearing the classic cowboy outfit.',
    selection: classicCowboySelection,
  },
  {
    id: 'rodeo_cowboy',
    name: 'Rodeo Cowboy',
    description:
      'Sheriff shirt and vest, western shorts, red boots, red bandana, and sheriff hat.',
    accessibilityLabel: 'Cow avatar wearing the rodeo cowboy outfit.',
    selection: rodeoCowboySelection,
  },
  {
    id: 'pink_princess',
    name: 'Pink Princess',
    description:
      'Sparkling pink bodice and ball gown, jeweled crown, and star wand.',
    accessibilityLabel: 'Cow avatar wearing the pink princess outfit.',
    selection: pinkPrincessSelection,
  },
] as const;

export const avatarCategories: readonly {
  id: AvatarCategoryId;
  label: string;
}[] = [
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'neck', label: 'Neck' },
  { id: 'face', label: 'Face' },
  { id: 'headwear', label: 'Headwear' },
  { id: 'handheld', label: 'Handheld' },
  { id: 'outfits', label: 'Complete Looks' },
];

export const avatarItemLorcoinPrice = 100;

export const avatarItemOptions: Record<
  AvatarItemSlot,
  readonly AvatarItemOption[]
> = {
  top: [
    {
      id: 'trail_tank',
      name: 'Trail Tank',
      description: 'A simple cream top for casual exploring.',
    },
    {
      id: 'explorer_field',
      name: 'Explorer Field Set',
      description: 'A rolled-sleeve field shirt with an olive utility vest.',
    },
    {
      id: 'new_explorer_tee',
      name: 'New Explorer Shirt',
      description: 'A cow-print shirt awarded for completing the tutorial.',
      unlockMissionKey: 'welcome-to-lorcal',
      unlockMessage: 'Complete the Welcome to Lorcal mission.',
    },
    {
      id: 'winter_polka_sweater',
      name: 'Polka-Dot Sweater',
      description: 'A warm mustard sweater with cheerful orange dots.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_sheriff_shirt',
      name: 'Sheriff Shirt & Vest',
      description: 'A blue western shirt with a fringed brown sheriff vest.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'princess_puff_bodice',
      name: 'Princess Bodice',
      description: 'A sparkling pink bodice with soft puff sleeves.',
      price: avatarItemLorcoinPrice,
    },
  ],
  bottom: [
    {
      id: 'trail_shorts',
      name: 'Trail Shorts',
      description: 'Comfortable neutral drawstring shorts.',
    },
    {
      id: 'explorer_cargo',
      name: 'Explorer Cargo Shorts',
      description: 'Tan belted shorts with roomy field pockets.',
    },
    {
      id: 'winter_charcoal_pants',
      name: 'Winter Pants',
      description: 'Relaxed charcoal pants with softly rolled cuffs.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_western_pants',
      name: 'Western Pants',
      description: 'Long tan western pants with a star-buckle belt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_western_shorts',
      name: 'Western Shorts',
      description: 'Tan western shorts with a star-buckle belt.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'princess_ballgown_skirt',
      name: 'Princess Ball Gown',
      description: 'A full sparkling pink skirt with layered petals.',
      price: avatarItemLorcoinPrice,
    },
  ],
  shoes: [
    {
      id: 'bare_hooves',
      name: 'Bare Hooves',
      description: 'The natural choice for a quick walk around the Yard.',
    },
    {
      id: 'explorer_boots',
      name: 'Explorer Boots',
      description: 'Brown lace-up walking boots with warm sock cuffs.',
    },
    {
      id: 'winter_snow_boots',
      name: 'Snow Boots',
      description: 'Fleece-lined boots with sturdy weather-ready soles.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_brown_boots',
      name: 'Brown Cowboy Boots',
      description: 'Classic brown leather boots with western stitching.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_red_boots',
      name: 'Red Sheriff Boots',
      description: 'Bright red cowboy boots with gold sheriff stars.',
      price: avatarItemLorcoinPrice,
    },
  ],
  neck: [
    {
      id: 'none',
      name: 'No Neck Accessory',
      description: 'Keep the neckline simple.',
    },
    {
      id: 'rust_neckerchief',
      name: 'Rust Neckerchief',
      description: 'A warm rust-red explorer scarf.',
    },
    {
      id: 'winter_cream_scarf',
      name: 'Cream Knit Scarf',
      description: 'A chunky braided scarf for cold-weather exploring.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_red_bandana',
      name: 'Red Bandana',
      description: 'A bright red paisley bandana tied for the trail.',
      price: avatarItemLorcoinPrice,
    },
  ],
  face: [
    {
      id: 'none',
      name: 'No Face Accessory',
      description: 'Keep the face clear.',
    },
    {
      id: 'explorer_goggles',
      name: 'Explorer Goggles',
      description: 'Round bronze goggles worn above the forehead.',
    },
  ],
  headwear: [
    {
      id: 'none',
      name: 'No Headwear',
      description: 'Keep the horns and hair uncovered.',
    },
    {
      id: 'winter_knit_beanie',
      name: 'Winter Knit Beanie',
      description: 'A teal cable-knit hat with a fluffy pom-pom.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'cowboy_sheriff_hat',
      name: 'Sheriff Hat',
      description: 'A brown cowboy hat finished with a gold sheriff star.',
      price: avatarItemLorcoinPrice,
    },
    {
      id: 'princess_crown',
      name: 'Princess Crown',
      description: 'A bright gold crown set with sparkling pink jewels.',
      price: avatarItemLorcoinPrice,
    },
  ],
  handheld: [
    {
      id: 'none',
      name: 'No Handheld Item',
      description: 'Keep both hooves free for exploring.',
    },
    {
      id: 'princess_star_wand',
      name: 'Star Wand',
      description: 'A magical pink wand topped with a shining star.',
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
    neckId: normalizeValue(value?.neckId, avatarNeckIds, fallback.neckId),
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
      return {
        ...selection,
        neckId: normalizeValue(itemId, avatarNeckIds, selection.neckId),
      };
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
  const match = avatarPresets.find((preset) =>
    Object.entries(preset.selection).every(
      ([key, value]) => selection[key as keyof AvatarSelection] === value,
    ),
  );

  return match?.id ?? 'custom';
}
