export const DEFAULT_BADGE_CONGRATULATIONS = [
  'Great job!',
  'Super sleuth!',
  'Awesome job!',
  'Fantastic find!',
  'Way to explore!',
  'You did it!',
  'Another achievement unlocked!',
  'Keep up the great work!',
  'Curiosity pays off!',
  'What a discovery!',
] as const;

export function getActiveBadgeCongratulations(
  messages:
    | { message: string; retired: boolean }[]
    | undefined,
) {
  const activeMessages = messages
    ?.filter((entry) => !entry.retired)
    .map((entry) => entry.message.trim())
    .filter(Boolean);

  return activeMessages !== undefined && activeMessages.length > 0
    ? activeMessages
    : [...DEFAULT_BADGE_CONGRATULATIONS];
}
