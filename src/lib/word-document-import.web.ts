import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';

import type { WordParagraph } from '@/lib/content-ingest';
import { parseWordDocumentXml } from '@/lib/word-document-xml';

export type PickedWordDocument = {
  fileName: string;
  paragraphs: WordParagraph[];
};

async function getAssetBytes(asset: DocumentPicker.DocumentPickerAsset) {
  if (asset.file) {
    return asset.file.arrayBuffer();
  }

  const response = await fetch(asset.uri);

  if (!response.ok) {
    throw new Error('The selected Word document could not be opened.');
  }

  return response.arrayBuffer();
}

export async function pickAndReadWordDocument(): Promise<PickedWordDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const archive = await JSZip.loadAsync(await getAssetBytes(asset));
  const documentFile = archive.file('word/document.xml');

  if (!documentFile) {
    throw new Error('This file does not contain a readable Word document.');
  }

  const paragraphs = parseWordDocumentXml(await documentFile.async('text'));

  if (paragraphs.length === 0) {
    throw new Error('No readable text was found in this Word document.');
  }

  return {
    fileName: asset.name,
    paragraphs,
  };
}
