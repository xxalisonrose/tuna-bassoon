import type { AvatarFitOverrides } from '@/lib/avatar-fit';

export type AvatarFitExportOptions = {
  changedItemIds: string[];
  fitOverrides: AvatarFitOverrides;
  onProgress?: (message: string) => void;
};

export type AvatarFitExportResult = {
  fileName: string;
  itemCount: number;
};
