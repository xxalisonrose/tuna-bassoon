import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), 'tuna-bassoon-import-validation-'),
);
const outputPath = join(temporaryDirectory, 'validate-content-import.mjs');

try {
  await build({
    entryPoints: ['scripts/validate-content-import.ts'],
    outfile: outputPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: 'inline',
    logLevel: 'silent',
  });

  process.argv = [process.argv[0], outputPath, ...process.argv.slice(2)];
  await import(pathToFileURL(outputPath).href);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
