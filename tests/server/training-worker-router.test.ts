import { readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';
import {
  compileTrainingRoutes,
  dispatchTrainingRequest,
} from '@/lib/cloudflare/training-router.mjs';
import { trainingRoutes } from '@/lib/cloudflare/training-routes.mjs';

afterEach(() => vi.unstubAllEnvs());
const gate = async () => NextResponse.next();
const request = (suffix: string, init?: RequestInit) =>
  new Request('https://teacherlab.weiyiai.top/api/training' + suffix, init);

it('covers every original training route exactly once', () => {
  const directory = path.resolve('app/api/training');
  const files = readdirSync(directory, { recursive: true })
    .map(String)
    .filter((name) => name.replaceAll('\\', '/').endsWith('/route.ts'))
    .map((name) => '/api/training/' + name.replaceAll('\\', '/').replace(/\/route\.ts$/, ''));
  expect(trainingRoutes.map((route) => route.path).sort()).toEqual(files.sort());
  expect(new Set(trainingRoutes.map((route) => route.path)).size).toBe(files.length);
});

it('runs the original access-code middleware before loading a protected handler', async () => {
  vi.stubEnv('ACCESS_CODE', 'router-test-access-code');
  const load = vi.fn();
  const response = await dispatchTrainingRequest(request('/scenarios'), {
    routes: compileTrainingRoutes([{ path: '/api/training/scenarios', load }]),
  });
  expect(response.status).toBe(401);
  expect(load).not.toHaveBeenCalled();
});

it('gives literal paths precedence over parameter paths', async () => {
  const response = await dispatchTrainingRequest(request('/references/validate'), {
    gate,
    routes: compileTrainingRoutes([
      {
        path: '/api/training/references/[id]',
        load: async () => ({ GET: () => new Response('id') }),
      },
      {
        path: '/api/training/references/validate',
        load: async () => ({ GET: () => new Response('validate') }),
      },
    ]),
  });
  expect(await response.text()).toBe('validate');
});

it('preserves origin, cookies, body, decoded params and multiple response cookies', async () => {
  const handler = vi.fn(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    expect(req.nextUrl.origin).toBe('https://teacherlab.weiyiai.top');
    expect(req.cookies.get('training_session')?.value).toBe('fixture-session');
    expect(req.headers.get('origin')).toBe('https://teacherlab.weiyiai.top');
    expect(await req.json()).toEqual({ content: '测试消息' });
    expect(await context.params).toEqual({ id: '训练 1' });
    const headers = new Headers();
    headers.append('set-cookie', 'one=1; HttpOnly');
    headers.append('set-cookie', 'two=2; HttpOnly');
    return new Response('saved', { status: 201, headers });
  });
  const response = await dispatchTrainingRequest(
    request('/trainings/' + encodeURIComponent('训练 1'), {
      method: 'POST',
      headers: {
        cookie: 'training_session=fixture-session',
        origin: 'https://teacherlab.weiyiai.top',
      },
      body: JSON.stringify({ content: '测试消息' }),
    }),
    {
      gate,
      routes: compileTrainingRoutes([
        { path: '/api/training/trainings/[id]', load: async () => ({ POST: handler }) },
      ]),
    },
  );
  expect(response.status).toBe(201);
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(handler).toHaveBeenCalledOnce();
});

it('preserves HEAD and OPTIONS behavior and refuses unsupported methods', async () => {
  const routes = compileTrainingRoutes([
    { path: '/api/training/records', load: async () => ({ GET: () => new Response('records') }) },
  ]);
  const head = await dispatchTrainingRequest(request('/records', { method: 'HEAD' }), {
    routes,
    gate,
  });
  expect(head.status).toBe(200);
  expect(await head.text()).toBe('');
  const options = await dispatchTrainingRequest(request('/records', { method: 'OPTIONS' }), {
    routes,
    gate,
  });
  expect(options.status).toBe(204);
  expect(options.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
  const post = await dispatchTrainingRequest(request('/records', { method: 'POST' }), {
    routes,
    gate,
  });
  expect(post.status).toBe(405);
});

it('returns 400 for malformed params, 404 for missing routes and a same-origin slash redirect', async () => {
  const routes = compileTrainingRoutes([
    {
      path: '/api/training/references/[id]',
      load: async () => ({ GET: () => new Response('ok') }),
    },
  ]);
  expect((await dispatchTrainingRequest(request('/references/%ZZ'), { routes, gate })).status).toBe(
    400,
  );
  expect((await dispatchTrainingRequest(request('/missing'), { routes, gate })).status).toBe(404);
  const response = await dispatchTrainingRequest(request('/references/id/?q=1'), { routes, gate });
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe(
    'https://teacherlab.weiyiai.top/api/training/references/id?q=1',
  );
});
