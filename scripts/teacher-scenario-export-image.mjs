import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const sourceSha = process.env.TEACHERLAB_SOURCE_SHA;
const checkoutSha = process.env.GITHUB_SHA;
const output = process.env.TEACHERLAB_IMAGE_OUTPUT;
assert.match(sourceSha ?? '', /^[a-f0-9]{40}$/);
assert.match(checkoutSha ?? '', /^[a-f0-9]{40}$/);
assert.ok(output && path.isAbsolute(output), 'An absolute artifact directory is required');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceTree = git('rev-parse', `${sourceSha}^{tree}`);
assert.equal(
  git('rev-parse', 'HEAD^{tree}'),
  sourceTree,
  'PR merge tree differs from feature head',
);
execFileSync('git', ['diff', '--exit-code', sourceSha, '--'], { stdio: 'pipe' });

const image = `teacher-scenario-lab-vps:${sourceSha}`;
execFileSync('docker', ['tag', `teacher-scenario-lab-ci:${checkoutSha}`, image]);
const inspected = JSON.parse(
  execFileSync('docker', ['image', 'inspect', image], { encoding: 'utf8' }),
)[0];
await mkdir(output, { recursive: true, mode: 0o700 });
const archive = path.join(output, 'teacherlab-vps-image.tar.gz');
const child = spawn('docker', ['save', image], { stdio: ['ignore', 'pipe', 'inherit'] });
const exited = new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('close', resolve);
});
await pipeline(child.stdout, createGzip({ level: 1 }), createWriteStream(archive, { flags: 'wx' }));
assert.equal(await exited, 0, 'Docker image export failed');
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
const manifest = {
  sourceSha,
  checkoutSha,
  sourceTree,
  image,
  imageId: inspected.Id,
  imageSizeBytes: inspected.Size,
  archiveSha256: hash.digest('hex'),
  archiveBytes: (await stat(archive)).size,
  builtAt: new Date().toISOString(),
};
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
