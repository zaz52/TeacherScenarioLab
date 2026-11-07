import { spawnSync } from 'node:child_process';

export function stopLocalWorker(child) {
  if (child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else child.kill();
}
