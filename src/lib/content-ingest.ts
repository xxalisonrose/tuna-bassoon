import {
  suggestLocationMapPinType,
  type LocationMapPinType,
} from '@/lib/location-map-pin';

export type WordParagraph = {
  text: string;
  style: string;
  mostlyStruck: boolean;
};

export type ImportConfidence = 'high' | 'medium' | 'low';

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
  importConfidence: ImportConfidence;
  suggestionNotes: string[];
  issues: string[];
};

export type BadgeClassification =
  'general' | 'theme' | 'special_place' | 'seasonal';

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
  importConfidence: ImportConfidence;
  suggestionNotes: string[];
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

export type LocationImportOptions = {
  availableBadgeTags?: string[];
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
  aliases: readonly string[];
}[] = [
  {
    pattern: /american revolution|revolutionary war/i,
    aliases: ['american-revolution'],
  },
  {
    pattern: /black history|black community|african american/i,
    aliases: ['black-history'],
  },
  {
    pattern: /cemeter|burial|burying ground|grave/i,
    aliases: ['cemeteries', 'cemetery'],
  },
  { pattern: /civil war/i, aliases: ['civil-war'] },
  { pattern: /ghost|haunt/i, aliases: ['ghost-stories'] },
  { pattern: /harvard/i, aliases: ['harvard-university', 'harvard-history'] },
  {
    pattern: /indigenous|native american|nipmuc|massachusett/i,
    aliases: ['indigenous-history', 'native-american-landmarks'],
  },
  {
    pattern: /legend|folklore|local lore|pirate lore/i,
    aliases: ['folklore-and-legends', 'folklore-legends'],
  },
  {
    pattern: /library|books?\b/i,
    aliases: ['books-and-libraries', 'books-libraries'],
  },
  {
    pattern: /memorial|monument/i,
    aliases: ['memorials-and-monuments', 'memorials-monuments'],
  },
  { pattern: /mystery|unresolved|unsolved/i, aliases: ['unsolved-mysteries'] },
  { pattern: /plaque|historical marker/i, aliases: ['plaque'] },
  { pattern: /public art|mural|installation/i, aliases: ['public-art'] },
  {
    pattern: /statue|sculpture/i,
    aliases: ['statues-and-sculpture', 'statues-sculpture'],
  },
  {
    pattern: /women'?s history|woman'?s history/i,
    aliases: ['women-s-history'],
  },
  {
    pattern: /industrial|manufactur|factor(?:y|ies)/i,
    aliases: ['industrial-history'],
  },
  {
    pattern: /maritime|navy|naval|sailor|shipbuilding/i,
    aliases: ['maritime-history'],
  },
  {
    pattern: /military|soldier|veteran|world war|\bwwii?\b/i,
    aliases: ['military-history'],
  },
  { pattern: /president|presidential/i, aliases: ['presidential-history'] },
  { pattern: /immigra|refugee/i, aliases: ['immigration-history'] },
  { pattern: /labor|workers?|strike|union/i, aliases: ['labor-history'] },
  {
    pattern: /transportation|railroad|railway|automobile|aviation/i,
    aliases: ['transportation-history'],
  },
  {
    pattern: /historic disaster|\bdisaster|flood|catastrophe/i,
    aliases: ['historic-disasters'],
  },
  {
    pattern: /inventor|scientist|scientific|research laborator/i,
    aliases: ['inventors-and-scientists', 'inventors-scientists', 'scientists'],
  },
  {
    pattern: /writer|poet|journalist|literary/i,
    aliases: ['writers-and-poets', 'writers-poets'],
  },
  {
    pattern: /artist|architect/i,
    aliases: ['artists-and-architects', 'artists-architects'],
  },
  { pattern: /educator|teacher|professor|education/i, aliases: ['educators'] },
  { pattern: /activist|abolitionist|civil rights/i, aliases: ['activists'] },
  { pattern: /explorer|expedition/i, aliases: ['explorers'] },
  {
    pattern: /athlete|sports?|baseball|football|basketball/i,
    aliases: ['athletes'],
  },
  { pattern: /entrepreneur|business founder/i, aliases: ['entrepreneurs'] },
  {
    pattern: /musician|performer|concert|theater|theatre|film|television/i,
    aliases: [
      'musicians-and-performers',
      'musicians-performers',
      'theater-music-film',
    ],
  },
  {
    pattern: /museum|collection|gallery/i,
    aliases: ['museums-and-collections', 'museums-collections', 'museums'],
  },
  {
    pattern: /cultural heritage|cultural tradition/i,
    aliases: ['cultural-heritage'],
  },
  { pattern: /national park/i, aliases: ['national-parks'] },
  {
    pattern: /national historic landmark/i,
    aliases: ['national-historic-landmarks'],
  },
  { pattern: /lighthouse/i, aliases: ['lighthouses'] },
  {
    pattern: /bridge|tunnel|dam|infrastructure/i,
    aliases: ['bridges-and-infrastructure', 'bridges-infrastructure'],
  },
  {
    pattern: /church|religious site|meeting house|chapel/i,
    aliases: [
      'churches-and-religious-sites',
      'churches-religious-sites',
      'churches',
    ],
  },
  { pattern: /archaeolog/i, aliases: ['archaeological-sites'] },
  {
    pattern: /strange history|weird history|bizarre/i,
    aliases: ['strange-history'],
  },
  {
    pattern: /famous crime|crime scene|criminal|murder|trial/i,
    aliases: ['famous-crimes'],
  },
  { pattern: /oddity|oddities|peculiar|curiosit/i, aliases: ['oddities'] },
  {
    pattern: /lost place|demolished|no longer (?:exists|survives)/i,
    aliases: ['lost-places'],
  },
  {
    pattern: /hidden gem|lesser-known|easy to (?:miss|overlook)/i,
    aliases: ['hidden-gem'],
  },
  { pattern: /scenic view|vista|skyline|overlook/i, aliases: ['scenic-view'] },
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

function normalizeTagSignature(value: string) {
  return slugify(value)
    .split('-')
    .filter((part) => part !== 'and' && part !== 'the')
    .join('-');
}

function suggestTags(
  rawCategory: string | undefined,
  text: string,
  availableBadgeTags: string[] | undefined,
) {
  const tags = new Set<string>();
  const catalogProvided = availableBadgeTags !== undefined;
  const availableTags = Array.from(
    new Set(
      (availableBadgeTags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const availableTagSet = new Set(availableTags);
  const tagsBySignature = new Map<string, string>();

  for (const tag of availableTags) {
    const signature = normalizeTagSignature(tag);

    if (!tagsBySignature.has(signature)) {
      tagsBySignature.set(signature, tag);
    }
  }

  const addSuggestion = (aliases: readonly string[]) => {
    if (!catalogProvided) {
      const fallback = aliases[0];

      if (fallback) {
        tags.add(fallback);
      }
      return;
    }

    for (const alias of aliases) {
      const exact = slugify(alias);
      const matched =
        (availableTagSet.has(exact) ? exact : undefined) ??
        tagsBySignature.get(normalizeTagSignature(alias));

      if (matched) {
        tags.add(matched);
        return;
      }
    }
  };

  for (const categoryPart of (rawCategory ?? '').split('/')) {
    const tag = slugify(categoryPart);

    if (tag && availableTagSet.has(tag)) {
      tags.add(tag);
    }
  }

  for (const suggestion of keywordTagSuggestions) {
    if (suggestion.pattern.test(text)) {
      addSuggestion(suggestion.aliases);
    }
  }

  return Array.from(tags).slice(0, 25);
}

function uniqueIssues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function parseLocationWordDocument(
  paragraphs: WordParagraph[],
  options: LocationImportOptions = {},
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
    const badges = suggestTags(
      rawCategory,
      combinedText,
      options.availableBadgeTags,
    );
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
    if (badges.length === 0) {
      issues.push(
        'No existing badge tag could be suggested. Choose at least one badge tag before publishing.',
      );
    }
    if (record.sourceWasMarkedComplete) {
      issues.push(
        'This entry is crossed out in the source document and may already be published.',
      );
    }
    if (
      (nameCounts.get(record.name.normalize('NFKC').trim().toLowerCase()) ??
        0) > 1
    ) {
      issues.push('The source document contains another entry with this name.');
    }

    const missingRequiredInformation =
      !description ||
      latitude === undefined ||
      latitude < -90 ||
      latitude > 90 ||
      longitude === undefined ||
      longitude < -180 ||
      longitude > 180 ||
      !category ||
      badges.length === 0;
    const rawCategoryKey = (rawCategory ?? '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
    const categoryWasDirectlyMapped = Boolean(
      canonicalLocationCategories.some(
        (value) => value.toLowerCase() === rawCategoryKey,
      ) || legacyLocationCategoryMap[rawCategoryKey],
    );
    const importConfidence: ImportConfidence = missingRequiredInformation
      ? 'low'
      : categoryWasDirectlyMapped && badges.length > 0
        ? 'high'
        : 'medium';
    const suggestionNotes = uniqueIssues([
      category
        ? categoryWasDirectlyMapped
          ? `Category matched directly to ${category}.`
          : `Category was inferred as ${category} from “${rawCategory ?? 'the source text'}.”`
        : 'No controlled location category matched automatically.',
      badges.length > 0
        ? `Matched existing badge ${badges.length === 1 ? 'tag' : 'tags'}: ${badges.join(', ')}.`
        : 'No existing badge tag matched automatically.',
      record.sourceWasMarkedComplete
        ? 'The source heading is crossed out, so this may already be published.'
        : '',
    ]);

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
      importConfidence,
      suggestionNotes,
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
  const cleaned = value
    .replace(/^Badge (?:message|description):\s*/i, '')
    .trim();

  return cleaned.replace(/^["“](.*)["”]$/s, '$1').trim();
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
    description: normalized.slice(separatorIndex + separator.length).trim(),
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
        categoryDescription ||
        categoryLine.replace(/^Category:\s*/i, '').trim();
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
    const unfinishedDraft =
      isNumberedDraft || /^Badge name:/i.test(paragraph.text);

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
    if (unfinishedDraft) {
      issues.push(
        'This appears in an unfinished draft section and needs review.',
      );
    }

    const importConfidence: ImportConfidence =
      !description || !message || unfinishedDraft
        ? 'low'
        : message.length > 160
          ? 'medium'
          : 'high';
    const suggestionNotes = uniqueIssues([
      `Classification was read as ${draftClassification.replace('_', ' ')}.`,
      `Stable key and badge tag were suggested from “${definition.name}.”`,
      unfinishedDraft
        ? 'This uses an unfinished-draft format and needs a careful review.'
        : '',
    ]);

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
      importConfidence,
      suggestionNotes,
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
