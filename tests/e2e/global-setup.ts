import { request, type FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const configuredBaseUrl = config.projects[0]?.use?.baseURL;
  const baseURL = typeof configuredBaseUrl === 'string'
    ? configuredBaseUrl
    : 'http://127.0.0.1:3000';
  const api = await request.newContext({ baseURL });

  try {
    // Compile dynamic Next routes before any test stores in-memory product state.
    // Fast Refresh during route compilation would otherwise reset active flows in
    // other Playwright workers and create false navigation/export timeouts.
    const routes: Array<{ method: 'get' | 'post'; path: string }> = [
      { method: 'get', path: '/' },
      { method: 'get', path: '/report/__e2e_warmup__' },
      { method: 'get', path: '/story/__e2e_warmup__' },
      { method: 'get', path: '/story/render/__e2e_warmup__?token=invalid&width=320&height=180&timeMs=0' },
      { method: 'post', path: '/api/story-exports/start' },
      { method: 'get', path: '/api/story-exports/__e2e_warmup__' },
      { method: 'get', path: '/api/story-exports/__e2e_warmup__/download' }
    ];

    for (const route of routes) {
      const response = route.method === 'post'
        ? await api.post(route.path, { data: {} })
        : await api.get(route.path);
      await response.dispose();
    }
  } finally {
    await api.dispose();
  }
}
