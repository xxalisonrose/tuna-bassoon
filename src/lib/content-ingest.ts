import {
  suggestLocationMapPinType,
  type LocationMapPinType,
} from '@/lib/location-map-pin';

export type WordParagraph = {
  text: string;
  style: string;
  mostlyStruck: boolean;
};

export type ParsedLocationDraft = {
  sourceOrdinal?: number;
  sourceText: string;
  sourceWasMarkedComplete: boolean;
  name: string;
  key: string;
  description: string;
  funFact?: string;
  source?: string;
  loreText?: string;
  isLore: boolean;
  latitude?: number;
  longitude?: number;
  category?: string;
  mapPinType?: LocationMapPinType;
  badges: string[];
  issues: string[];
};

export type BadgeClassification =
  | 'general'
  | 'theme'
  | 'special_place'
  | 'seasonal';

export type ParsedBadgeDraft = {
  sourceOrdinal?: number;
  sourceText: string;
  sourceWasMarkedComplete: boolean;
  name: string;
  key: string;
  tag: string;
  description: string;
  classification: BadgeClassification;
  requiredVisits: number;
  levelsEnabled: boolean;
  congratulationsMessages: string[];
  issues: string[];
};

export type ParsedIngestResult<T> = {
  drafts: T[];
  warnings: string[];
};

type SourceLine = {
  text: string;
  mostlyStruck: boolean;
};

const canonicalLocationCategories = [
  'History & Heritage',
  'Culture & Arts',
  'Literature & Libraries',
  'People & Community',
  'Science & Nature',
  'Architecture & Places',
  'Weird & Curious',
] as const;

const legacyLocationCategoryMap: Record<
  string,
  (typeof canonicalLocationCategories)[number]
> = {
  architecture: 'Architecture & Places',
  art: 'Culture & Arts',
  'black history': 'History & Heritage',
  books: 'Literature & Libraries',
  'books & libraries': 'Literature & Libraries',
  'cultural heritage': 'History & Heritage',
  folklore: 'Weird & Curious',
  'harvard history': 'History & Heritage',
  'harvard people': 'People & Community',
  'historic artifact': 'History & Heritage',
  'historic building': 'Architecture & Places',
  'historic events': 'History & Heritage',
  'historic home': 'Architecture & Places',
  'historic object': 'History & Heritage',
  'historic places': 'Architecture & Places',
  libraries: 'Literature & Libraries',
  library: 'Literature & Libraries',
  'local history': 'History & Heritage',
  memorial: 'History & Heritage',
  'museum, science and art': 'Culture & Arts',
  'natural wonders': 'Science & Nature',
  oddities: 'Weird & Curious',
  'people, politics, industrial history': 'History & Heritage',
  'public art': 'Culture & Arts',
  'public gardens': 'Science & Nature',
  'religious history': 'History & Heritage',
  transportation: 'History & Heritage',
  'writers & poets': 'Literature & Libraries',
};

const locationHeaderPattern = /^(\d+)\.\s+(.+)$/;
const locationFieldPattern =
  /^(Category|Description|Fun Fact|Lore|Latitude|Longitude|Source):\s*(.*)$/i;

const categoryKeywordGroups = [
  {
    category: 'Weird & Curious',
    keywords: [
      'curious',
      'folklore',
      'ghost',
      'legend',
      'lore',
      'mystery',
      'odd',
      'paranormal',
      'pirate',
      'strange',
      'witch',
    ],
  },
  {
    category: 'People & Community',
    keywords: [
      'activist',
      'athlete',
      'community',
      'educator',
      'people',
      'person',
      'politic',
      'president',
      'writer',
    ],
  },
  {
    category: 'Literature & Libraries',
    keywords: ['book', 'library', 'literature', 'poet', 'writer'],
  },
  {
    category: 'Science & Nature',
    keywords: [
      'astronomy',
      'ecology',
      'engineering',
      'environment',
      'medicine',
      'nature',
      'science',
      'technology',
    ],
  },
  {
    category: 'Culture & Arts',
    keywords: [
      'art',
      'culture',
      'film',
      'music',
      'sculpture',
      'theater',
      'television',
    ],
  },
  {
    category: 'Architecture & Places',
    keywords: [
      'architecture',
      'building',
      'home',
      'house',
      'infrastructure',
      'landmark',
    ],
  },
  {
    category: 'History & Heritage',
    keywords: [
      'archaeology',
      'cemeter',
      'colonial',
      'disaster',
      'heritage',
      'history',
      'military',
      'revolution',
      'war',
    ],
  },
] as const;

const keywordTagSuggestions: {
  pattern: RegExp;
  tag: string;
}[] = [
  { pattern: /american revolution|revolutionary war/i, tag: 'american-revolution' },
  { pattern: /black history|black community|african american/i, tag: 'black-history' },
  { pattern: /cemeter|burial|burying ground|grave/i, tag: 'cemeteries' },
  { pattern: /civil war/i, tag: 'civil-war' },
  { pattern: /ghost|haunt/i, tag: 'ghost-stories' },
  { pattern: /harvard/i, tag: 'harvard-history' },
  { pattern: /indigenous|native american|nipmuc|massachusett/i, tag: 'indigenous-history' },
  { pattern: /legend|folklore|local lore|pirate lore/i, tag: 'folklore-legends' },
  { pattern: /library|books?\b/i, tag: 'books-libraries' },
  { pattern: /memorial|monument/i, tag: 'memorials-monuments' },
  { pattern: /mystery|unresolved|unsolved/i, tag: 'unsolved-mysteries' },
  { pattern: /plaque|marker/i, tag: 'plaque' },
  { pattern: /public art|mural|installation/i, tag: 'public-art' },
  { pattern: /statue|sculpture/i, tag: 'statues-sculpture' },
  { pattern: /women'?s history|woman'?s history/i, tag: 'women-s-history' },
];

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function flattenParagraphs(paragraphs: WordParagraph[]): SourceLine[] {
  return paragraphs.flatMap((paragraph) =>
    paragraph.text
      .split(/\r?\n/)
      .map((text) => ({
        text: text.trim(),
        mostlyStruck: paragraph.mostlyStruck,
      }))
      .filter((line) => line.text.length > 0),
  );
}

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const number = Number(value.trim());
  return Number.isFinite(number) ? number : undefined;
}

function inferLocationCategory(rawCategory: string | undefined) {
  const lookupKey = (rawCategory ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const directCategory =
    canonicalLocationCategories.find(
      (category) => category.toLowerCase() === lookupKey,
    ) ?? legacyLocationCategoryMap[lookupKey];

  if (directCategory) {
    return directCategory;
  }

  const normalized = (rawCategory ?? '').toLowerCase();
  let bestCategory: string | undefined;
  let bestScore = 0;

  for (const group of categoryKeywordGroups) {
    const score = group.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      bestCategory = group.category;
      bestScore = score;
    }
  }

  return bestCategory;
}

function suggestTags(rawCategory: string | undefined, text: string) {
  const tags = new Set<string>();

  for (const categoryPart of (rawCategory ?? '').split('/')) {
    const tag = slugify(categoryPart);

    if (tag) {
      tags.add(tag);
    }
  }

  for (const suggestion of keywordTagSuggestions) {
    if (suggestion.pattern.test(text)) {
      tags.add(suggestion.tag);
    }
  }

  if (tags.size === 0) {
    tags.add('local-history');
  }

  return Array.from(tags).slice(0, 25);
}

function uniqueIssues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function parseLocationWordDocument(
  paragraphs: WordParagraph[],
): ParsedIngestResult<ParsedLocationDraft> {
  const lines = flattenParagraphs(paragraphs);
  const rawRecords: {
    sourceOrdinal: number;
    name: string;
    sourceWasMarkedComplete: boolean;
    lines: string[];
  }[] = [];
  let activeRecord: (typeof rawRecords)[number] | undefined;

  for (const line of lines) {
    const header = locationHeaderPattern.exec(line.text);

    if (header) {
      if (activeRecord) {
        rawRecords.push(activeRecord);
      }

      activeRecord = {
        sourceOrdinal: Number(header[1]),
        name: header[2].trim(),
        sourceWasMarkedComplete: line.mostlyStruck,
        lines: [],
      };
      continue;
    }

    activeRecord?.lines.push(line.text);
  }

  if (activeRecord) {
    rawRecords.push(activeRecord);
  }

  const warnings: string[] = [];
  const ordinals = rawRecords.map((record) => record.sourceOrdinal);
  const minimumOrdinal = Math.min(...ordinals);
  const maximumOrdinal = Math.max(...ordinals);

  if (Number.isFinite(minimumOrdinal) && Number.isFinite(maximumOrdinal)) {
    const missingOrdinals = Array.from(
      { length: maximumOrdinal - minimumOrdinal + 1 },
      (_, index) => minimumOrdinal + index,
    ).filter((ordinal) => !ordinals.includes(ordinal));

    if (missingOrdinals.length > 0) {
      warnings.push(
        `The source numbering skips: ${missingOrdinals.join(', ')}.`,
      );
    }
  }

  const nameCounts = new Map<string, number>();

  for (const record of rawRecords) {
    const nameKey = record.name.normalize('NFKC').trim().toLowerCase();
    nameCounts.set(nameKey, (nameCounts.get(nameKey) ?? 0) + 1);
  }

  const drafts = rawRecords.map((record) => {
    const fields = new Map<string, string>();

    for (const line of record.lines) {
      const field = locationFieldPattern.exec(line);

      if (field) {
        fields.set(field[1].toLowerCase(), field[2].trim());
      }
    }

    const rawCategory = fields.get('category');
    const description = fields.get('description') ?? '';
    const loreText = fields.get('lore');
    const category = inferLocationCategory(rawCategory);
    const combinedText = [
      record.name,
      rawCategory,
      description,
      fields.get('fun fact'),
      loreText,
    ]
      .filter(Boolean)
      .join(' ');
    const badges = suggestTags(rawCategory, combinedText);
    const isLore =
      Boolean(loreText) ||
      /ghost|legend|lore|mystery|paranormal|witch/i.test(
        `${rawCategory ?? ''} ${description}`,
      );
    const issues: string[] = [];
    const latitude = parseCoordinate(fields.get('latitude'));
    const longitude = parseCoordinate(fields.get('longitude'));

    if (!description) {
      issues.push('Description is missing.');
    }
    if (latitude === undefined || latitude < -90 || latitude > 90) {
      issues.push('A valid latitude is missing.');
    }
    if (longitude === undefined || longitude < -180 || longitude > 180) {
      issues.push('A valid longitude is missing.');
    }
    if (!category) {
      issues.push('A standard location category could not be suggested.');
    }
    if (record.sourceWasMarkedComplete) {
      issues.push(
        'This entry is crossed out in the source document and may already be published.',
      );
    }
    if (
      (nameCounts.get(
        record.name.normalize('NFKC').trim().toLowerCase(),
      ) ?? 0) > 1
    ) {
      issues.push('The source document contains another entry with this name.');
    }

    return {
      sourceOrdinal: record.sourceOrdinal,
      sourceText: [
        `${record.sourceOrdinal}. ${record.name}`,
        ...record.lines,
      ].join('\n'),
      sourceWasMarkedComplete: record.sourceWasMarkedComplete,
      name: record.name,
      key: slugify(record.name),
      description,
      funFact: fields.get('fun fact') || undefined,
      source: fields.get('source') || undefined,
      loreText: loreText || undefined,
      isLore,
      latitude,
      longitude,
      category,
      mapPinType: category
        ? suggestLocationMapPinType({ badges, category, isLore })
        : undefined,
      badges,
      issues: uniqueIssues(issues),
    };
  });

  return { drafts, warnings };
}

function getBadgePreset(classification: BadgeClassification) {
  switch (classification) {
    case 'general':
      return { requiredVisits: 5, levelsEnabled: true };
    case 'theme':
      return { requiredVisits: 2, levelsEnabled: true };
    case 'special_place':
    case 'seasonal':
      return { requiredVisits: 1, levelsEnabled: false };
  }
}

function cleanBadgeMessage(value: string) {
  return value.replace(/^Badge (?:message|description):\s*/i, '').trim();
}

function parseBadgeDefinition(value: string) {
  const normalized = value.replace(/^\d+\.\s*/, '').trim();

  if (/^(Badge (?:name|description)|Category):/i.test(normalized)) {
    return null;
  }

  const separatorIndex = normalized.search(/\s[—-]\s/);

  if (separatorIndex < 0) {
    return null;
  }

  const separator = normalized.slice(separatorIndex).match(/^\s[—-]\s/)?.[0];

  if (!separator) {
    return null;
  }

  return {
    name: normalized.slice(0, separatorIndex).trim(),
    description: normalized
      .slice(separatorIndex + separator.length)
      .trim(),
  };
}

export function parseBadgeWordDocument(
  paragraphs: WordParagraph[],
): ParsedIngestResult<ParsedBadgeDraft> {
  const values = paragraphs
    .map((paragraph) => ({
      ...paragraph,
      text: paragraph.text.trim(),
    }))
    .filter((paragraph) => paragraph.text.length > 0);
  const drafts: ParsedBadgeDraft[] = [];
  const warnings: string[] = [];
  let classification: BadgeClassification | null = null;
  let unfinishedDraftSection = false;
  let sourceOrdinal = 0;

  for (let index = 0; index < values.length; index += 1) {
    const paragraph = values[index];
    const upperText = paragraph.text.toUpperCase();

    if (upperText === 'GENERAL BADGES') {
      classification = 'general';
      unfinishedDraftSection = false;
      continue;
    }
    if (upperText === 'SPECIAL PLACE BADGES') {
      classification = 'special_place';
      unfinishedDraftSection = false;
      continue;
    }
    if (upperText === 'THEME BADGES') {
      classification = 'theme';
      unfinishedDraftSection = false;
      continue;
    }
    if (upperText === 'SEASONAL' || upperText === 'YEARLY') {
      classification = 'seasonal';
      unfinishedDraftSection = false;
      continue;
    }

    let definition = parseBadgeDefinition(paragraph.text);
    let description = definition?.description ?? '';
    let message = '';
    let consumedThrough = index;
    const isNumberedDraft = /^\d+\.\s+/.test(paragraph.text);

    if (isNumberedDraft) {
      unfinishedDraftSection = true;
    }

    if (definition && classification) {
      const next = values[index + 1];
      const following = values[index + 2];

      if (isNumberedDraft && next && !/^Badge message:/i.test(next.text)) {
        description = next.text;
        consumedThrough = index + 1;

        if (following && /^Badge message:/i.test(following.text)) {
          message = cleanBadgeMessage(following.text);
          consumedThrough = index + 2;
        }
      } else if (
        next &&
        !parseBadgeDefinition(next.text) &&
        !/^(GENERAL BADGES|SPECIAL PLACE BADGES|THEME BADGES|SEASONAL|YEARLY)$/i.test(
          next.text,
        )
      ) {
        message = cleanBadgeMessage(next.text);
        consumedThrough = index + 1;
      }
    } else if (/^Badge name:/i.test(paragraph.text)) {
      const name = paragraph.text.replace(/^Badge name:\s*/i, '').trim();
      const categoryLine = values[index + 1]?.text ?? '';
      const descriptionLine = values[index + 2]?.text ?? '';
      const categoryDescription = categoryLine
        .replace(/^Category:\s*/i, '')
        .split(/\s[—-]\s/)
        .slice(1)
        .join(' — ')
        .trim();
      description =
        categoryDescription || categoryLine.replace(/^Category:\s*/i, '').trim();
      definition = {
        name,
        description,
      };
      message = cleanBadgeMessage(descriptionLine);
      classification = classification ?? 'general';
      consumedThrough = Math.min(index + 2, values.length - 1);
    }

    if (!definition || !classification) {
      continue;
    }

    const draftClassification = unfinishedDraftSection
      ? 'general'
      : classification;

    sourceOrdinal += 1;
    const preset = getBadgePreset(draftClassification);
    const issues: string[] = [];

    if (!description) {
      issues.push('Description is missing.');
    }
    if (!message) {
      issues.push('Congratulations message is missing.');
    } else if (message.length > 160) {
      issues.push(
        `Congratulations message is ${message.length} characters; the limit is 160.`,
      );
    }
    if (draftClassification === 'seasonal') {
      issues.push('Confirm the badge availability dates before publishing.');
    }
    if (isNumberedDraft || /^Badge name:/i.test(paragraph.text)) {
      issues.push('This appears in an unfinished draft section and needs review.');
    }

    drafts.push({
      sourceOrdinal,
      sourceText: values
        .slice(index, consumedThrough + 1)
        .map((value) => value.text)
        .join('\n'),
      sourceWasMarkedComplete: paragraph.mostlyStruck,
      name: definition.name,
      key: slugify(definition.name),
      tag: slugify(definition.name),
      description,
      classification: draftClassification,
      requiredVisits: preset.requiredVisits,
      levelsEnabled: preset.levelsEnabled,
      congratulationsMessages: message ? [message] : [],
      issues: uniqueIssues(issues),
    });

    index = consumedThrough;
  }

  const duplicateNames = new Map<string, number>();

  for (const draft of drafts) {
    const key = draft.name.normalize('NFKC').toLowerCase();
    duplicateNames.set(key, (duplicateNames.get(key) ?? 0) + 1);
  }

  for (const draft of drafts) {
    if (
      (duplicateNames.get(draft.name.normalize('NFKC').toLowerCase()) ?? 0) > 1
    ) {
      draft.issues = uniqueIssues([
        ...draft.issues,
        'The source document contains another badge with this name.',
      ]);
    }
  }

  if (drafts.length === 0) {
    warnings.push('No badge definitions could be recognized in this document.');
  }

  return { drafts, warnings };
}
