export type BadgeArtworkAsset = {
  file?: Blob;
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
};

export type BadgeArtworkPickerResult =
  | { canceled: true }
  | { canceled: false; asset: BadgeArtworkAsset };
