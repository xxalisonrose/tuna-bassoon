import { useHostedAuth } from '@clerk/expo/hosted-auth';

export type AuthMode = 'sign-in' | 'sign-up';

export function useStartAuth() {
  const { startHostedAuth } = useHostedAuth();

  return async (mode: AuthMode) => {
    await startHostedAuth({ mode });
  };
}
