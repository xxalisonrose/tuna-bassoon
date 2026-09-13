type RedirectSystemPathOptions = {
  path: string;
  initial: boolean;
};

export function redirectSystemPath({
  path,
}: RedirectSystemPathOptions): string {
  try {
    if (path.includes('.hosted-callback')) {
      return '/';
    }

    return path;
  } catch {
    return '/';
  }
}