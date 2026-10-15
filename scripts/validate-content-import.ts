import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';

import {
  parseBadgeWordDocument,
  parseLocationWordDocument,
  type ImportConfidence,
  type ParsedIngestResult,
} from '../src/lib/content-ingest';
import { parseWordDocumentXml } from '../src/lib/word-document-xml';

type Arguments = {
  locations?: string;
  badges?: string;
  expectedLocations?: number;
  expectedBadges?: number;
};

function readArguments(values: string[]): Arguments {
  const result: Arguments = {};

  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index];
    const value = values[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`A value is required after ${flag}.`);
    }

    if (flag === '--locations') {
      result.locations = value;
    } else if (flag === '--badges') {
      result.badges = value;
    } else if (flag === '--expect-locations') {
      result.expectedLocations = Number(value);
    } else if (flag === '--expect-badges') {
      result.expectedBadges = Number(value);
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }

    index += 1;
  }

  if (!result.locations && !result.badges) {
    throw new Error(
      'Provide --locations, --badges, or both with paths to .docx files.',
    );
  }

  return result;
}

async function readWordParagraphs(path: string) {
  const archive = await JSZip.loadAsync(await readFile(path));
  const documentFile = archive.file('word/document.xml');

  if (!documentFile) {
    throw new Error(`${basename(path)} is not a readable .docx file.`);
  }

  return parseWordDocumentXml(
    await documentFile.async('text'),
    new DOMParser() as unknown as DOMParser,
  );
}

function confidenceCounts(drafts: { importConfidence: ImportConfidence }[]) {
  return drafts.reduce(
    (counts, draft) => {
      counts[draft.importConfidence] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function printSummary<
  T extends {
    issues: string[];
    importConfidence: ImportConfidence;
    sourceWasMarkedComplete: boolean;
  },
>(label: string, filePath: string, result: ParsedIngestResult<T>) {
  const confidence = confidenceCounts(result.drafts);
  const withIssues = result.drafts.filter(
    (draft) => draft.issues.length > 0,
  ).length;
  const crossedOut = result.drafts.filter(
    (draft) => draft.sourceWasMarkedComplete,
  ).length;

  console.log(`\n${label}: ${basename(filePath)}`);
  console.log(`  Proposals: ${result.drafts.length}`);
  console.log(
    `  Confidence: ${confidence.high} high, ${confidence.medium} medium, ${confidence.low} low`,
  );
  console.log(`  With review notes: ${withIssues}`);
  console.log(`  Crossed out in source: ${crossedOut}`);

  for (const warning of result.warnings) {
    console.log(`  Warning: ${warning}`);
  }
}

function assertExpectedCount(
  label: string,
  actual: number,
  expected: number | undefined,
) {
  if (expected !== undefined && actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, but found ${actual}.`);
  }
}

async function main() {
  const args = readArguments(process.argv.slice(2));
  const failures: string[] = [];
  let badgeTags: string[] | undefined;

  if (args.badges) {
    const badgeResult = parseBadgeWordDocument(
      await readWordParagraphs(args.badges),
    );
    printSummary('Badge import', args.badges, badgeResult);
    assertExpectedCount(
      'badge proposals',
      badgeResult.drafts.length,
      args.expectedBadges,
    );

    badgeTags = badgeResult.drafts.map((draft) => draft.tag);
    const quotedMessages = badgeResult.drafts.filter((draft) =>
      draft.congratulationsMessages.some((message) =>
        /^["“]|["”]$/.test(message.trim()),
      ),
    );

    if (quotedMessages.length > 0) {
      failures.push(
        `${quotedMessages.length} badge messages still contain wrapping quotation marks.`,
      );
    }
  }

  if (args.locations) {
    const locationResult = parseLocationWordDocument(
      await readWordParagraphs(args.locations),
      { availableBadgeTags: badgeTags },
    );
    printSummary('Location import', args.locations, locationResult);
    assertExpectedCount(
      'location proposals',
      locationResult.drafts.length,
      args.expectedLocations,
    );

    if (badgeTags) {
      const badgeTagSet = new Set(badgeTags);
      const unmatchedTags = Array.from(
        new Set(
          locationResult.drafts
            .flatMap((draft) => draft.badges)
            .filter((tag) => !badgeTagSet.has(tag)),
        ),
      );

      if (unmatchedTags.length > 0) {
        failures.push(
          `Location suggestions contain unknown badge tags: ${unmatchedTags.join(', ')}.`,
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }

  console.log('\nImporter validation passed. Nothing was added or published.');
}

void main().catch((error: unknown) => {
  console.error(
    `\nImporter validation failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
