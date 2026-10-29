import type {
  AvatarFitExportOptions,
  AvatarFitExportResult,
} from '@/lib/avatar-fit-export.types';

export async function exportAvatarFitBatch(
  _options: AvatarFitExportOptions,
): Promise<AvatarFitExportResult> {
  throw new Error(
    'Avatar fitting exports are available from the web Content Portal.',
  );
}
