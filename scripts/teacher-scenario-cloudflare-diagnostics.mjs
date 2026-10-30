import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const references = [];
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
await writeFile('cloudflare-dependency-diagnostics.json', JSON.stringify({ references }, null, 2));
console.log(JSON.stringify({ references }));
