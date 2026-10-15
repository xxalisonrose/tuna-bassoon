const categoryKeywordGroups = [
  {
    category: 'Weird & Curious',
    keywords: [
      'curious',
      'folklore',
      'ghost',
      'haunt',
      'legend',
      'lore',
      'mystery',
      'odd',
      'paranormal',
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
      'person',
      'politic',
      'president',
      'professor',
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
      'garden',
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
      'theatre',
    ],
  },
  {
    category: 'Architecture & Places',
    keywords: [
      'architecture',
      'building',
      'hall',
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
      'historic',
      'history',
      'military',
      'revolution',
      'war',
    ],
  },
] as const;

const tagSuggestions: {
  pattern: RegExp;
  aliases: readonly string[];
}[] = [
  {
    pattern: /american revolution|revolutionary war/i,
    aliases: ['american-revolution'],
  },
  {
    pattern: /black history|african american/i,
    aliases: ['black-history'],
  },
  { pattern: /civil war/i, aliases: ['civil-war'] },
  { pattern: /ghost|haunt/i, aliases: ['ghost-stories'] },
  {
    pattern: /legend|folklore|local lore/i,
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
  {
    pattern: /statue|sculpture/i,
    aliases: ['statues-and-sculpture', 'statues-sculpture'],
  },
  {
    pattern: /women'?s history|woman'?s history/i,
    aliases: ['women-s-history'],
  },
  {
    pattern: /indigenous|native american/i,
    aliases: ['indigenous-history', 'native-american-landmarks'],
  },
  {
    pattern: /scientist|inventor|laborator/i,
    aliases: ['inventors-and-scientists', 'scientists'],
  },
  {
    pattern: /writer|poet|journalist/i,
    aliases: ['writers-and-poets', 'writers-poets'],
  },
  {
    pattern: /artist|architect/i,
    aliases: ['artists-and-architects', 'artists-architects'],
  },
  { pattern: /plaque|historical marker/i, aliases: ['plaque'] },
  { pattern: /public art|mural/i, aliases: ['public-art'] },
  { pattern: /harvard/i, aliases: ['harvard-history', 'harvard-university'] },
];

export function createSubmissionStableKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function suggestCategory(text: string) {
  const normalized = text.toLowerCase();
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

function suggestMapPinType(
  text: string,
  category: string | undefined,
  isLore: boolean,
) {
  if (isLore || /ghost|haunt|legend|lore|mystery|paranormal/i.test(text)) {
    return 'mystery_lore' as const;
  }
  if (category === 'People & Community') {
    return 'noteworthy_people' as const;
  }
  if (/statue|sculpture|monument|memorial|public art|mural/i.test(text)) {
    return 'monuments_public_art' as const;
  }
  if (
    category === 'History & Heritage' ||
    category === 'Architecture & Places' ||
    category === 'Literature & Libraries'
  ) {
    return 'historic_sites' as const;
  }
  return 'other_discoveries' as const;
}

function suggestTags(text: string, availableTags: string[]) {
  const available = new Set(
    availableTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  );
  const tags = new Set<string>();

  for (const suggestion of tagSuggestions) {
    if (!suggestion.pattern.test(text)) {
      continue;
    }

    const matched = suggestion.aliases.find((alias) => available.has(alias));

    if (matched) {
      tags.add(matched);
    }
  }

  return Array.from(tags).slice(0, 25);
}

export function suggestLocationSubmission(input: {
  name: string;
  description: string;
  funFact?: string;
  source: string;
  locationInput?: string;
  locationNotes?: string;
  isLore: boolean;
  availableTags: string[];
}) {
  const text = [
    input.name,
    input.description,
    input.funFact,
    input.source,
    input.locationInput,
    input.locationNotes,
  ]
    .filter(Boolean)
    .join(' ');
  const key = createSubmissionStableKey(input.name);
  const category = suggestCategory(text);
  const mapPinType = suggestMapPinType(text, category, input.isLore);
  const badges = suggestTags(text, input.availableTags);
  const suggestionNotes = [
    `Stable key suggested as ${key || 'unavailable'}.`,
    category
      ? `Category suggested as ${category}.`
      : 'No standard category could be suggested automatically.',
    `Map pin suggested as ${mapPinType}.`,
    badges.length > 0
      ? `Matched existing badge ${badges.length === 1 ? 'tag' : 'tags'}: ${badges.join(', ')}.`
      : 'No existing badge tags matched automatically.',
  ];

  return {
    key,
    category,
    mapPinType,
    badges,
    suggestionNotes,
  };
}
