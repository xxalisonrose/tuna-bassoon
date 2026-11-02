import JSZip from 'jszip';
import { Asset } from 'expo-asset';

import { avatarItemOptions } from '@/lib/avatar';
import { avatarImages, avatarItemImageSources } from '@/lib/avatar-assets';
import {
  avatarItemFits,
  getAvatarItemFit,
  type AvatarFit,
} from '@/lib/avatar-fit';
import { buildAvatarMaskSvg, type AvatarMaskStamp } from '@/lib/avatar-mask';
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
  maskStamps,
}: {
  baseImage: string;
  fit: AvatarFit;
  itemImage: string;
  itemName: string;
  maskStamps: AvatarMaskStamp[];
}) {
  const x = (fit.left / 100) * exportCanvasSize;
  const y = (fit.top / 100) * exportCanvasSize;
  const width = (fit.width / 100) * exportCanvasSize;
  const height = (fit.height / 100) * exportCanvasSize;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const maskShapes = maskStamps
    .map(
      (stamp) =>
        `<ellipse cx="${x + (stamp.x / 100) * width}" cy="${y + (stamp.y / 100) * height}" rx="${(stamp.radiusX / 100) * width}" ry="${(stamp.radiusY / 100) * height}" fill="black" />`,
    )
    .join('\n      ');
  const maskDefinition = maskStamps.length
    ? `<defs>
    <mask id="item-visibility-mask" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" />
      ${maskShapes}
    </mask>
  </defs>`
    : '';
  const maskAttribute = maskStamps.length
    ? ' mask="url(#item-visibility-mask)"'
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportCanvasSize}" height="${exportCanvasSize}" viewBox="0 0 ${exportCanvasSize} ${exportCanvasSize}">
  <title>${escapeXml(itemName)} Lorcal fitting preview</title>
  ${maskDefinition}
  <rect width="${exportCanvasSize}" height="${exportCanvasSize}" rx="64" fill="#443A2D" />
  <image href="${baseImage}" x="0" y="0" width="${exportCanvasSize}" height="${exportCanvasSize}" preserveAspectRatio="none" />
  <image href="${itemImage}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" transform="rotate(${fit.rotation} ${centerX} ${centerY})"${maskAttribute} />
</svg>`;
}

function buildMaskedLayerSvg({
  itemImage,
  itemName,
  maskStamps,
}: {
  itemImage: string;
  itemName: string;
  maskStamps: AvatarMaskStamp[];
}) {
  const maskShapes = maskStamps
    .map(
      (stamp) =>
        `<ellipse cx="${(stamp.x / 100) * exportCanvasSize}" cy="${(stamp.y / 100) * exportCanvasSize}" rx="${(stamp.radiusX / 100) * exportCanvasSize}" ry="${(stamp.radiusY / 100) * exportCanvasSize}" fill="black" />`,
    )
    .join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportCanvasSize}" height="${exportCanvasSize}" viewBox="0 0 ${exportCanvasSize} ${exportCanvasSize}">
  <title>${escapeXml(itemName)} masked garment layer</title>
  <defs>
    <mask id="item-visibility-mask">
      <rect width="${exportCanvasSize}" height="${exportCanvasSize}" fill="white" />
      ${maskShapes}
    </mask>
  </defs>
  <image href="${itemImage}" width="${exportCanvasSize}" height="${exportCanvasSize}" preserveAspectRatio="none" mask="url(#item-visibility-mask)" />
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
  maskOverrides,
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
  const maskedItemLayers = zip.folder('masked-item-layers');
  const occlusionMasks = zip.folder('occlusion-masks');
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
  const changedMasks = Object.fromEntries(
    uniqueItemIds
      .filter((itemId) => (maskOverrides[itemId]?.length ?? 0) > 0)
      .map((itemId) => [itemId, maskOverrides[itemId]]),
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
    const maskStamps = maskOverrides[itemId] ?? [];
    const svg = buildPreviewSvg({
      baseImage: baseDataUrl,
      fit,
      itemImage: itemDataUrl,
      itemName,
      maskStamps,
    });
    const png = await svgToPng(svg);

    previews?.file(`${itemId}.png`, png);
    previews?.file(`${itemId}.svg`, svg);
    sourceImages?.file(`${itemId}.png`, itemBlob);

    if (maskStamps.length > 0) {
      const maskedLayerSvg = buildMaskedLayerSvg({
        itemImage: itemDataUrl,
        itemName,
        maskStamps,
      });
      const maskedLayerPng = await svgToPng(maskedLayerSvg);

      maskedItemLayers?.file(`${itemId}.png`, maskedLayerPng);
      maskedItemLayers?.file(`${itemId}.svg`, maskedLayerSvg);
      occlusionMasks?.file(
        `${itemId}.svg`,
        buildAvatarMaskSvg(escapeXml(itemName), maskStamps, exportCanvasSize),
      );
      occlusionMasks?.file(
        `${itemId}.json`,
        JSON.stringify(maskStamps, null, 2),
      );
    }
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
        changedMasks,
        exportedAt,
        fits: allFits,
        masks: maskOverrides,
        version: 2,
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
      'previews/ contains composed PNG and SVG previews with the occlusion masks applied.',
      'masked-item-layers/ contains transparent PNG and SVG garment layers with each mask applied.',
      'occlusion-masks/ contains white-visible, black-hidden SVG masks and the editable stamp data.',
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
