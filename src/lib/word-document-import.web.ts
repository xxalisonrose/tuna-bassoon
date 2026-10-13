import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';

import type { WordParagraph } from '@/lib/content-ingest';

export type PickedWordDocument = {
  fileName: string;
  paragraphs: WordParagraph[];
};

function hasElement(run: Element, localName: string) {
  return run.getElementsByTagNameNS('*', localName).length > 0;
}

function getWordAttribute(element: Element, name: string) {
  return (
    element.getAttributeNS(
      'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      name,
    ) ??
    element.getAttribute(`w:${name}`) ??
    element.getAttribute(name) ??
    ''
  );
}

function readRunText(run: Element) {
  const pieces: string[] = [];

  for (const node of Array.from(run.getElementsByTagName('*'))) {
    if (node.localName === 't') {
      pieces.push(node.textContent ?? '');
    } else if (node.localName === 'tab') {
      pieces.push('\t');
    } else if (node.localName === 'br' || node.localName === 'cr') {
      pieces.push('\n');
    }
  }

  return pieces.join('');
}

function parseWordDocumentXml(xml: string): WordParagraph[] {
  const document = new DOMParser().parseFromString(
    xml,
    'application/xml',
  );

  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The Word document could not be read.');
  }

  return Array.from(document.getElementsByTagNameNS('*', 'p'))
    .map((paragraph) => {
      const runs = Array.from(
        paragraph.getElementsByTagNameNS('*', 'r'),
      );
      let struckCharacters = 0;
      let totalCharacters = 0;
      const text = runs
        .map((run) => {
          const runText = readRunText(run);
          const length = runText.trim().length;
          totalCharacters += length;

          if (hasElement(run, 'strike') || hasElement(run, 'dstrike')) {
            struckCharacters += length;
          }

          return runText;
        })
        .join('')
        .replace(/\u00a0/g, ' ')
        .trim();
      const styleElement = paragraph
        .getElementsByTagNameNS('*', 'pStyle')
        .item(0);

      return {
        text,
        style: styleElement ? getWordAttribute(styleElement, 'val') : '',
        mostlyStruck:
          totalCharacters > 0 && struckCharacters / totalCharacters >= 0.6,
      };
    })
    .filter((paragraph) => paragraph.text.length > 0);
}

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

export async function pickAndReadWordDocument(): Promise<
  PickedWordDocument | null
> {
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
