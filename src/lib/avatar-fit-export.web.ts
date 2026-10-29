import JSZip from 'jszip';
import { Asset } from 'expo-asset';

import { avatarItemOptions } from '@/lib/avatar';
import { avatarImages, avatarItemImageSources } from '@/lib/avatar-assets';
import {
  avatarItemFits,
  getAvatarItemFit,
  type AvatarFit,
} from '@/lib/avatar-fit';
import type {
  AvatarFitExportOptions,
  AvatarFitExportResult,
} from '@/lib/avatar-fit-export.types';

const exportCanvasSize = 1024;

const avatarItemNames = Object.fromEntries(
  Object.values(avatarItemOptions)
    .flat()
    .map((item) => [item.id, item.name]),
);

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function getAssetBlob(source: number) {
  const asset = Asset.fromModule(source);

  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri ?? asset.uri;

  if (!uri) {
    throw new Error('One of the avatar images could not be resolved.');
  }

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`Could not load avatar image: ${response.status}`);
  }

  return response.blob();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read avatar image.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function buildPreviewSvg({
  baseImage,
  fit,
  itemImage,
  itemName,
}: {
  baseImage: string;
  fit: AvatarFit;
  itemImage: string;
  itemName: string;
}) {
  const x = (fit.left / 100) * exportCanvasSize;
  const y = (fit.top / 100) * exportCanvasSize;
  const width = (fit.width / 100) * exportCanvasSize;
  const height = (fit.height / 100) * exportCanvasSize;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportCanvasSize}" height="${exportCanvasSize}" viewBox="0 0 ${exportCanvasSize} ${exportCanvasSize}">
  <title>${escapeXml(itemName)} Lorcal fitting preview</title>
  <rect width="${exportCanvasSize}" height="${exportCanvasSize}" rx="64" fill="#443A2D" />
  <image href="${baseImage}" x="0" y="0" width="${exportCanvasSize}" height="${exportCanvasSize}" preserveAspectRatio="none" />
  <image href="${itemImage}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" transform="rotate(${fit.rotation} ${centerX} ${centerY})" />
</svg>`;
}

function svgToPng(svg: string) {
  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const imageUrl = URL.createObjectURL(svgBlob);
    const image = new window.Image();

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Could not render an avatar preview image.'));
    };
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.height = exportCanvasSize;
      canvas.width = exportCanvasSize;
      const context = canvas.getContext('2d');

      if (!context) {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('This browser could not create the preview canvas.'));
        return;
      }

      context.drawImage(image, 0, 0, exportCanvasSize, exportCanvasSize);
      URL.revokeObjectURL(imageUrl);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('This browser could not save the preview image.'));
        }
      }, 'image/png');
    };
    image.src = imageUrl;
  });
}

function getExportFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `lorcal-avatar-fit-batch-${date}.zip`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = url;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportAvatarFitBatch({
  changedItemIds,
  fitOverrides,
  onProgress,
}: AvatarFitExportOptions): Promise<AvatarFitExportResult> {
  const exportedAt = new Date().toISOString();
  const uniqueItemIds = [...new Set(changedItemIds)].filter(
    (itemId) => getAvatarItemFit(itemId, fitOverrides) !== undefined,
  );

  if (uniqueItemIds.length === 0) {
    throw new Error('Adjust at least one avatar item before exporting.');
  }

  onProgress?.('Preparing avatar images...');
  const zip = new JSZip();
  const previews = zip.folder('previews');
  const sourceImages = zip.folder('source-images');
  const baseBlob = await getAssetBlob(avatarImages.base);
  const baseDataUrl = await blobToDataUrl(baseBlob);
  sourceImages?.file('avatar-neutral-reference.png', baseBlob);

  const changedFits = Object.fromEntries(
    uniqueItemIds.map((itemId) => [
      itemId,
      getAvatarItemFit(itemId, fitOverrides),
    ]),
  );
  const allFits = Object.fromEntries(
    Object.keys(avatarItemFits).map((itemId) => [
      itemId,
      getAvatarItemFit(itemId, fitOverrides),
    ]),
  );

  for (const [index, itemId] of uniqueItemIds.entries()) {
    onProgress?.(
      `Rendering preview ${index + 1} of ${uniqueItemIds.length}...`,
    );
    const source = avatarItemImageSources[itemId];
    const fit = getAvatarItemFit(itemId, fitOverrides);

    if (!source || !fit) {
      continue;
    }

    const itemBlob = await getAssetBlob(source);
    const itemDataUrl = await blobToDataUrl(itemBlob);
    const itemName = avatarItemNames[itemId] ?? itemId;
    const svg = buildPreviewSvg({
      baseImage: baseDataUrl,
      fit,
      itemImage: itemDataUrl,
      itemName,
    });
    const png = await svgToPng(svg);

    previews?.file(`${itemId}.png`, png);
    previews?.file(`${itemId}.svg`, svg);
    sourceImages?.file(`${itemId}.png`, itemBlob);
  }

  zip.file(
    'avatar-fit-data.json',
    JSON.stringify(
      {
        canvas: {
          height: exportCanvasSize,
          unit: 'percent',
          width: exportCanvasSize,
        },
        changedFits,
        changedItemIds: uniqueItemIds,
        exportedAt,
        fits: allFits,
        version: 1,
      },
      null,
      2,
    ),
  );
  zip.file(
    'README.txt',
    [
      'Lorcal Avatar Fitting Lab export',
      '',
      `Exported: ${exportedAt}`,
      `Adjusted items: ${uniqueItemIds.length}`,
      '',
      'Send this complete ZIP when requesting that the approved fitting values be applied.',
      'avatar-fit-data.json contains both the changed values and the complete merged fitting registry.',
      'previews/ contains composed PNG and SVG previews over the neutral cow.',
      'source-images/ contains the exact prototype layers used by the previews.',
    ].join('\n'),
  );

  onProgress?.('Compressing export...');
  const fileName = getExportFileName();
  const archive = await zip.generateAsync({
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    type: 'blob',
  });
  downloadBlob(archive, fileName);

  return {
    fileName,
    itemCount: uniqueItemIds.length,
  };
}
