import type { AvatarFitOverrides } from '@/lib/avatar-fit';
import type { AvatarMaskOverrides } from '@/lib/avatar-mask';

export type AvatarFitExportOptions = {
  changedItemIds: string[];
  fitOverrides: AvatarFitOverrides;
  maskOverrides: AvatarMaskOverrides;
  onProgress?: (message: string) => void;
};

export type AvatarFitExportResult = {
  fileName: string;
  itemCount: number;
};
