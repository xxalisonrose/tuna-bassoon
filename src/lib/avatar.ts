export const avatarPresetIds = [
  'explorer',
  'trail_basics',
] as const;

export type AvatarPresetId = (typeof avatarPresetIds)[number];

export const avatarTopIds = [
  'trail_tank',
  'explorer_field',
  'new_explorer_tee',
] as const;
export const avatarBottomIds = [
  'trail_shorts',
  'explorer_cargo',
] as const;
export const avatarShoesIds = [
  'bare_hooves',
  'explorer_boots',
] as const;
export const avatarNeckIds = [
  'none',
  'rust_neckerchief',
] as const;
export const avatarFaceIds = [
  'none',
  'explorer_goggles',
] as const;

export type AvatarTopId = (typeof avatarTopIds)[number];
export type AvatarBottomId = (typeof avatarBottomIds)[number];
export type AvatarShoesId = (typeof avatarShoesIds)[number];
export type AvatarNeckId = (typeof avatarNeckIds)[number];
export type AvatarFaceId = (typeof avatarFaceIds)[number];

export type AvatarSelection = {
  topId: AvatarTopId;
  bottomId: AvatarBottomId;
  shoesId: AvatarShoesId;
  neckId: AvatarNeckId;
  faceId: AvatarFaceId;
};

export type AvatarItemSlot =
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'neck'
  | 'face';

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
  unlockMissionKey?: string;
  unlockMessage?: string;
};

export const trailBasicsSelection: AvatarSelection = {
  topId: 'trail_tank',
  bottomId: 'trail_shorts',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
};

export const explorerSelection: AvatarSelection = {
  topId: 'explorer_field',
  bottomId: 'explorer_cargo',
  shoesId: 'explorer_boots',
  neckId: 'rust_neckerchief',
  faceId: 'explorer_goggles',
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
] as const;

export const avatarCategories: readonly {
  id: AvatarCategoryId;
  label: string;
}[] = [
  { id: 'outfits', label: 'Outfits' },
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'neck', label: 'Neck' },
  { id: 'face', label: 'Face' },
];

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
};

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
    shoesId: normalizeValue(
      value?.shoesId,
      avatarShoesIds,
      fallback.shoesId,
    ),
    neckId: normalizeValue(value?.neckId, avatarNeckIds, fallback.neckId),
    faceId: normalizeValue(value?.faceId, avatarFaceIds, fallback.faceId),
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
  }
}

export function getMatchingAvatarPresetId(
  selection: AvatarSelection,
): AvatarPresetId | 'custom' {
  const match = avatarPresets.find((preset) =>
    Object.entries(preset.selection).every(
      ([key, value]) =>
        selection[key as keyof AvatarSelection] === value,
    ),
  );

  return match?.id ?? 'custom';
}
