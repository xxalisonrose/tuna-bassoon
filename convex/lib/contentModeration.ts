const builtInBlockedTerms = [
  'asshole',
  'bastard',
  'bitch',
  'cunt',
  'dick',
  'faggot',
  'fuck',
  'kike',
  'nigger',
  'pussy',
  'retard',
  'shit',
  'spic',
  'tranny',
  'wetback',
];

function normalizeForModeration(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getBlockedTerms() {
  return Array.from(
    new Set([
      ...builtInBlockedTerms,
      ...(process.env.CONTENT_BLOCKED_TERMS ?? '').split(','),
    ]),
  )
    .map(normalizeForModeration)
    .filter(Boolean);
}

export function containsBlockedUsernameContent(value: string) {
  const compactValue = normalizeForModeration(value).replace(/\s+/g, '');

  return getBlockedTerms().some((term) =>
    compactValue.includes(term.replace(/\s+/g, '')),
  );
}

function containsBlockedTerm(value: string, blockedTerms: string[]) {
  const normalized = ` ${normalizeForModeration(value)} `;

  return blockedTerms.some((term) => normalized.includes(` ${term} `));
}

export function moderateLocationSubmission(fields: {
  name: string;
  description: string;
  funFact?: string;
  source: string;
  locationInput?: string;
  locationNotes?: string;
}) {
  const blockedTerms = getBlockedTerms();
  const flags: string[] = [];
  const labeledValues = [
    ['Name', fields.name],
    ['Description', fields.description],
    ['Fun Fact', fields.funFact ?? ''],
    ['Source', fields.source],
    ['Address or Map Link', fields.locationInput ?? ''],
    ['Location Details', fields.locationNotes ?? ''],
  ] as const;

  for (const [label, value] of labeledValues) {
    if (containsBlockedTerm(value, blockedTerms)) {
      flags.push(`Potential profanity or slur detected in ${label}.`);
    }
  }

  return flags;
}
