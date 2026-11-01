import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const result = await build({
  entryPoints: ['cloudflare-training-worker.mjs'],
  outfile: '.cloudflare-training/worker.mjs',
  bundle: true,
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  conditions: ['workerd'],
  external: ['cloudflare:workers', 'node:*'],
  alias: {
    '@': process.cwd(),
    'next/server': path.resolve('lib/cloudflare/training-next-server.mjs'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_RUNTIME': '"nodejs"',
  },
  metafile: true,
});
// Match OpenNext's native-require compatibility patch before Wrangler bundles the entry.
const output = '.cloudflare-training/worker.mjs';
const code = await readFile(output, 'utf8');
await writeFile(
  output,
  code
    .replace(/(?<![.#$\w])__require\d?\(/g, 'require(')
    .replace(/(?<![.#$\w])__require\d?\./g, 'require.'),
);
await writeFile('.cloudflare-training/bundle.meta.json', JSON.stringify(result.metafile));
console.log(
  JSON.stringify({
    trainingApiBundleBytes: result.metafile.outputs['.cloudflare-training/worker.mjs'].bytes,
  }),
);
