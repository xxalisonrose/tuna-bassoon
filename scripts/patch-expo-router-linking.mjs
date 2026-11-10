import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const linkingModuleUrl = new URL(
  '../node_modules/expo-router/build/fork/useLinking.native.js',
  import.meta.url,
);
const linkingModulePath = fileURLToPath(linkingModuleUrl);
const patchMarker = 'initialLinkingMountedRef';

if (!existsSync(linkingModulePath)) {
  throw new Error(
    'Expo Router native linking module was not found. Update the Lorcal patch for the installed Router version.',
  );
}

const source = readFileSync(linkingModulePath, 'utf8');

if (source.includes(patchMarker)) {
  console.log('Expo Router initial-link patch is already applied.');
  process.exit(0);
}

const refsNeedle =
  '    const getActionFromStateRef = (0, react_1.useRef)(getActionFromState);\n';
const refsReplacement = `${refsNeedle}    // SDK 57 can resolve Android's initial URL before this hook commits.\n    // Defer its state callback until the first effect to avoid a pre-mount update.\n    const initialLinkingMountedRef = (0, react_1.useRef)(false);\n    const pendingUnhandledLinkRef = (0, react_1.useRef)(null);\n    (0, react_1.useEffect)(() => {\n        initialLinkingMountedRef.current = true;\n        const pendingLink = pendingUnhandledLinkRef.current;\n        pendingUnhandledLinkRef.current = null;\n        if (pendingLink !== null) {\n            onUnhandledLinking(pendingLink);\n        }\n        return () => {\n            initialLinkingMountedRef.current = false;\n        };\n    }, [onUnhandledLinking]);\n`;
const asyncNeedle = `                        if (typeof url === 'string') {\n                            // If the link were handled, it gets cleared in NavigationContainer\n                            onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));\n                        }`;
const asyncReplacement = `                        if (typeof url === 'string') {\n                            // If the link were handled, it gets cleared in NavigationContainer\n                            const unhandledPath = (0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url);\n                            if (initialLinkingMountedRef.current) {\n                                onUnhandledLinking(unhandledPath);\n                            }\n                            else {\n                                pendingUnhandledLinkRef.current = unhandledPath;\n                            }\n                        }`;

if (!source.includes(refsNeedle) || !source.includes(asyncNeedle)) {
  throw new Error(
    'Expo Router linking code changed. Update the Lorcal initial-link patch before installing dependencies.',
  );
}

const patchedSource = source
  .replace(refsNeedle, refsReplacement)
  .replace(asyncNeedle, asyncReplacement);

writeFileSync(linkingModulePath, patchedSource);
console.log('Applied Expo Router Android initial-link mount patch.');
