import {
  installTrainingNetwork,
  resolveDohRecords,
} from '../../../lib/cloudflare/training-network.mjs';
import { validatePublicUrlForSSRF } from '../../../lib/server/ssrf-guard';

installTrainingNetwork();
const worker = {
  async fetch(request) {
    if (new URL(request.url).pathname === '/health') return new Response('ok');
    const result = { passed: false };
    try {
      result.addresses = await resolveDohRecords('example.com', 4);
      result.publicProblem = await validatePublicUrlForSSRF('https://example.com/v1');
      result.privateProblem = await validatePublicUrlForSSRF('https://127.0.0.1/v1');
      result.passed = result.publicProblem === null && result.privateProblem !== null;
    } catch (error) {
      result.error = { name: error.name, message: error.message };
    }
    return Response.json(result, { status: result.passed ? 200 : 500 });
  },
};
export default worker;
