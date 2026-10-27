import Constants from 'expo-constants';

type EmbeddedBuildInfo = {
  buildProfile?: string;
};

function readBuildInfo(value: unknown): EmbeddedBuildInfo {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as EmbeddedBuildInfo;
}

export const buildProfile = readBuildInfo(
  Constants.expoConfig?.extra?.buildInfo,
).buildProfile ?? 'local';

export const isBetaBuild =
  buildProfile === 'beta' || buildProfile === 'beta-apk';
