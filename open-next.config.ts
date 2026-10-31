import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default {
  ...defineCloudflareConfig({}),
  // Shared server chunks must fit the Workers uncompressed upload limit.
  buildCommand: 'pnpm build --webpack',
};
