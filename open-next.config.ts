import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = {
  ...defineCloudflareConfig({}),
  // Shared server chunks must fit the Workers uncompressed upload limit.
  buildCommand: 'pnpm build --webpack',
};

export default config;
