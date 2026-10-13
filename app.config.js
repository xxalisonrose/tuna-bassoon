const { execFileSync } = require('node:child_process');

function readGitValue(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function getBuildInfo() {
  const easRevision = process.env.EAS_BUILD_GIT_COMMIT_HASH;
  const localRevision = readGitValue(['rev-parse', 'HEAD']);
  const fullRevision = easRevision || localRevision;
  const sourceBranch = readGitValue(['branch', '--show-current']);
  const localChanges = readGitValue(['status', '--porcelain']);

  return {
    ...(fullRevision
      ? { sourceRevision: fullRevision.slice(0, 7) }
      : {}),
    ...(sourceBranch ? { sourceBranch } : {}),
    sourceStatus: process.env.EAS_BUILD
      ? 'packaged'
      : localChanges
        ? 'modified'
        : localRevision
          ? 'clean'
          : 'unknown',
    buildProfile: process.env.EAS_BUILD_PROFILE || 'local',
  };
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    buildInfo: getBuildInfo(),
  },
});
