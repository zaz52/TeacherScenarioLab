import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const references = [];
const bundleInputs = new Map();
async function inspectMetadata(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') await inspectMetadata(file);
    else if (entry.isFile() && entry.name.endsWith('.meta.json')) {
      const metadata = JSON.parse(await readFile(file, 'utf8'));
      for (const output of Object.values(metadata.outputs ?? {})) {
        for (const [input, details] of Object.entries(output.inputs ?? {})) {
          bundleInputs.set(input, (bundleInputs.get(input) ?? 0) + details.bytesInOutput);
        }
      }
    }
  }
}
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') await inspect(file);
    else if (entry.isFile() && /\.[cm]?js$/.test(entry.name)) {
      const code = await readFile(file, 'utf8');
      const hits = [
        ...code.matchAll(
          /(?:teacherlab-images\/(?:node|opennext|workerd)\.mjs|["'](?:@teacherlab\/images|sharp)["'])/g,
        ),
      ];
      if (hits.length)
        references.push({
          file,
          matches: hits.length,
          modules: [...new Set(hits.map((hit) => hit[0]))],
        });
    }
  }
}
await inspect('.next/server');
await inspect('.open-next/server-functions/default');
await inspectMetadata('.open-next');
const upload = (await readFile('cloudflare-dry-run.log', 'utf8').catch(() => '')).match(
  /Total Upload:\s*([\d.]+) KiB/,
);
const bundle = upload
  ? { uncompressedKiB: Number(upload[1]), limitKiB: 65536, withinLimit: Number(upload[1]) <= 65536 }
  : null;
const largestInputs = [...bundleInputs]
  .sort((left, right) => right[1] - left[1])
  .slice(0, 25)
  .map(([file, bytes]) => ({ file, bytes }));
const result = { references, bundle, largestInputs };
await writeFile('cloudflare-dependency-diagnostics.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (process.argv.includes('--enforce-size') && bundle && !bundle.withinLimit) process.exitCode = 1;
