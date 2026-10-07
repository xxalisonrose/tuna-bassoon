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

export function getBadgeCongratulations(
  messages: string[] | undefined,
) {
  const activeMessages = messages
    ?.map((message) => message.trim())
    .filter(Boolean);

  return activeMessages !== undefined && activeMessages.length > 0
    ? activeMessages
    : [...DEFAULT_BADGE_CONGRATULATIONS];
}
