import type {
  GenerateMenuAndRoutesOptions,
  RouteRecordRaw,
  RouteRecordStringComponent,
} from '@vben/types';

import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateAccessible } from '../../../../../packages/effects/access/src/accessible';
import { generateAccess } from '../access';
import { withDefaultKeepAlive } from '../keep-alive';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), menus: vi.fn() }));
vi.mock('@vben/access', () => ({ generateAccessible: mocks.generate }));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { accessMode: 'backend' } },
}));
vi.mock('#/api/core/menu', () => ({ getAllMenusApi: mocks.menus }));
vi.mock('#/layouts', () => ({ BasicLayout: {}, IFrameView: {} }));

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [] });
}

beforeEach(() => vi.clearAllMocks());

describe('tab cache route defaults', () => {
  it('defaults nested routes without mutating the input or overriding explicit false', () => {
    const routes: RouteRecordStringComponent[] = [
      {
        name: 'Orders',
        path: '/orders',
        component: 'BasicLayout',
        meta: { title: 'Orders' },
        children: [
          {
            name: 'List',
            path: '/orders/list',
            component: '/orders/list',
            meta: { title: 'List' },
          },
          {
            name: 'Fresh',
            path: '/orders/fresh',
            component: '/orders/fresh',
            meta: { title: 'Fresh', keepAlive: false },
          },
        ],
      },
    ];
    const original = structuredClone(routes);
    const result = withDefaultKeepAlive(routes);
    expect(result[0]?.meta).toEqual({ title: 'Orders', keepAlive: true });
    expect(result[0]?.children?.[0]?.meta).toEqual({
      title: 'List',
      keepAlive: true,
    });
    expect(result[0]?.children?.[1]?.meta?.keepAlive).toBe(false);
    expect(routes).toEqual(original);
    expect(result[0]?.children).not.toBe(routes[0]?.children);
    expect(result[0]?.children?.[0]?.meta).not.toBe(
      routes[0]?.children?.[0]?.meta,
    );
  });

  it('passes defaulted local and fetched backend routes into access generation', async () => {
    const local: RouteRecordRaw[] = [
      {
        name: 'Local',
        path: '/local',
        meta: { title: 'Local' },
        children: [
          {
            name: 'LocalChild',
            path: '/local/child',
            component: {},
            meta: { title: 'Child' },
          },
        ],
      },
    ];
    const backend: RouteRecordStringComponent[] = [
      {
        name: 'Backend',
        component: 'BasicLayout',
        path: '/backend',
        meta: { title: 'Backend' },
        children: [
          {
            name: 'BackendChild',
            path: '/backend/child',
            component: '/backend/child',
            meta: { title: 'Child' },
          },
          {
            name: 'Uncached',
            path: '/uncached',
            component: '/uncached',
            meta: { title: 'Uncached', keepAlive: false },
          },
        ],
      },
    ];
    mocks.menus.mockResolvedValue(backend);
    await generateAccess({ routes: local, router: makeRouter() });
    expect(mocks.generate).toHaveBeenCalledOnce();
    const [mode, options] = mocks.generate.mock.calls[0] as [
      string,
      GenerateMenuAndRoutesOptions,
    ];
    expect(mode).toBe('backend');
    expect(options.routes[0]?.children?.[0]?.meta?.keepAlive).toBe(true);
    const fetched = await options.fetchMenuListAsync?.();
    expect(fetched?.[0]?.children?.[0]?.meta?.keepAlive).toBe(true);
    expect(fetched?.[0]?.children?.[1]?.meta?.keepAlive).toBe(false);
    expect(local[0]?.meta?.keepAlive).toBeUndefined();
    expect(backend[0]?.children?.[0]?.meta?.keepAlive).toBeUndefined();
  });

  it('lets real Vben wrap a differently named lazy view with the cache route name', async () => {
    const view = defineComponent({
      name: 'ListPage',
      setup: () => () => h('div', 'Orders'),
    });
    const loader = async () => ({ default: view });
    const result = await generateAccessible('frontend', {
      routes: withDefaultKeepAlive([
        {
          name: 'YumieOrders',
          path: '/orders',
          component: loader,
          meta: { title: 'Orders' },
        },
      ]),
      router: makeRouter(),
    });
    const component = result.accessibleRoutes[0]?.component;
    expect(typeof component).toBe('function');
    expect(component).not.toBe(loader);
    if (typeof component !== 'function')
      throw new Error('Expected a lazy route');
    const wrapped = await (component as () => Promise<{ name: string }>)();
    expect(wrapped.name).toBe('YumieOrders');
    expect(view.name).toBe('ListPage');
  });
});
