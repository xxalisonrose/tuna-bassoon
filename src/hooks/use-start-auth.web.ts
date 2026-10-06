import { useClerk } from '@clerk/expo';

type AuthMode = 'sign-in' | 'sign-up';

export function useStartAuth() {
  const clerk = useClerk();

  return async (mode: AuthMode) => {
    if (mode === 'sign-in') {
      clerk.openSignIn();
      return;
    }

    clerk.openSignUp();
  };
}
