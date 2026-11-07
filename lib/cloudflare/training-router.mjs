import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { trainingRoutes } from './training-routes.mjs';

const METHODS = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function compileTrainingRoutes(routes) {
  return routes
    .map((route) => {
      const segments = route.path.split('/').filter(Boolean);
      return { ...route, segments, specificity: segments.filter((s) => !s.startsWith('[')).length };
    })
    .sort((a, b) => b.specificity - a.specificity);
}

const compiled = compileTrainingRoutes(trainingRoutes);

export async function dispatchTrainingRequest(
  request,
  { routes = compiled, gate = middleware } = {},
) {
  const req = new NextRequest(request);
  const admitted = await gate(req);
  if (admitted && admitted.headers.get('x-middleware-next') !== '1') return admitted;
  const path = req.nextUrl.pathname;
  if (path.endsWith('/') && path !== '/') {
    const target = new URL(req.url);
    target.pathname = path.replace(/\/+$/, '');
    return new Response(null, { status: 308, headers: { location: target.href } });
  }
  const segments = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.segments.length !== segments.length) continue;
    const params = {};
    let matches = true;
    for (let i = 0; i < segments.length; i++) {
      const pattern = route.segments[i];
      if (pattern.startsWith('[') && pattern.endsWith(']')) {
        try {
          params[pattern.slice(1, -1)] = decodeURIComponent(segments[i]);
        } catch {
          return new Response('Bad Request', { status: 400 });
        }
      } else if (pattern !== segments[i]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    const handlers = await route.load();
    const allowed = METHODS.filter(
      (method) => handlers[method] || method === 'OPTIONS' || (method === 'HEAD' && handlers.GET),
    );
    const handler = handlers[req.method] ?? (req.method === 'HEAD' ? handlers.GET : undefined);
    if (!handler) {
      return new Response(null, {
        status: req.method === 'OPTIONS' ? 204 : 405,
        headers: { allow: allowed.join(', ') },
      });
    }
    const response = await handler(req, { params: Promise.resolve(params) });
    if (req.method === 'HEAD') {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return response;
  }
  return new Response('Not Found', { status: 404 });
}
