import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const cli = path.resolve(
  path.dirname(require.resolve('@opennextjs/cloudflare')),
  '../cli/index.js',
);
const result = spawnSync(process.execPath, [cli, 'build', ...process.argv.slice(2)], {
  env: { ...process.env, TEACHERLAB_BUILD_TARGET: 'cloudflare' },
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
