import handler from './.open-next/worker.js';
import { Pool } from 'pg';
import { installRequestPools, withRequestPools } from './lib/cloudflare/request-pools.mjs';

installRequestPools(Pool);
const worker = {
  fetch(request, env, context) {
    return withRequestPools((...args) => handler.fetch(...args), request, env, context);
  },
};
export default worker;
