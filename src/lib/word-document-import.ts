import type { WordParagraph } from '@/lib/content-ingest';

export type PickedWordDocument = {
  fileName: string;
  paragraphs: WordParagraph[];
};

export async function pickAndReadWordDocument(): Promise<
  PickedWordDocument | null
> {
  throw new Error(
    'Word document import is currently available in the web Content Portal.',
  );
}
