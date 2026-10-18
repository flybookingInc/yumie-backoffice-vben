import type { App } from 'vue';

import { createApp, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BasicLayout from '../../layouts/basic.vue';

const mocks = vi.hoisted(() => ({
  hotel: { currentHotelId: 'hotel-a' },
  navigation: { current: 'orders' },
  unmount: vi.fn(),
}));
vi.mock('#/store/hotel', async () => {
  const { reactive } = await import('vue');
  mocks.hotel = reactive(mocks.hotel);
  return { useHotelStore: () => mocks.hotel };
});
vi.mock('@vben/layouts', async () => {
  const { defineComponent, h, KeepAlive, reactive, onUnmounted, ref } =
    await import('vue');
  mocks.navigation = reactive(mocks.navigation);
  const page = (name: string) =>
    defineComponent({
      name,
      setup() {
        const count = ref(0);
        const hotelId = mocks.hotel.currentHotelId;
        onUnmounted(() => mocks.unmount(name, hotelId));
        return () =>
          h(
            'button',
            { onClick: () => count.value++ },
            `${name}:${hotelId}:${count.value}`,
          );
      },
    });
  const pages = { orders: page('Orders'), inventory: page('Inventory') };
  return {
    BasicLayout: defineComponent({
      setup: () => () =>
        h(
          KeepAlive,
          {},
          {
            default: () =>
              h(
                mocks.navigation.current === 'orders'
                  ? pages.orders
                  : pages.inventory,
              ),
          },
        ),
    }),
    Notification: {},
    UserDropdown: {},
  };
});
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/common-ui', () => ({ AuthenticationLoginExpiredModal: {} }));
vi.mock('@vben/hooks', () => ({
  useWatermark: () => ({ destroyWatermark: vi.fn(), updateWatermark: vi.fn() }),
}));
vi.mock('@vben/preferences', () => ({
  preferences: { app: {} },
  usePreferences: () => ({ isDark: false }),
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({}),
  useUserStore: () => ({}),
}));
vi.mock('#/store', () => ({ useAuthStore: () => ({ logout: vi.fn() }) }));
vi.mock('#/components/HotelDocSubscriber.vue', () => ({ default: {} }));
vi.mock('#/components/HotelSwitcher.vue', () => ({ default: {} }));
vi.mock('#/views/_core/authentication/login.vue', () => ({ default: {} }));

let app: App | undefined;
let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hotel.currentHotelId = 'hotel-a';
  mocks.navigation.current = 'orders';
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  container.remove();
});

describe('hotel-scoped tab cache', () => {
  it('preserves page state across tabs and destroys active and inactive caches on hotel change', async () => {
    app = createApp(BasicLayout);
    app.mount(container);
    container.querySelector('button')?.click();
    await nextTick();
    expect(container.textContent).toBe('Orders:hotel-a:1');
    mocks.navigation.current = 'inventory';
    await nextTick();
    expect(container.textContent).toBe('Inventory:hotel-a:0');
    mocks.navigation.current = 'orders';
    await nextTick();
    expect(container.textContent).toBe('Orders:hotel-a:1');
    expect(mocks.unmount).not.toHaveBeenCalled();

    mocks.hotel.currentHotelId = 'hotel-b';
    await nextTick();
    expect(container.textContent).toBe('Orders:hotel-b:0');
    expect(mocks.unmount).toHaveBeenCalledWith('Orders', 'hotel-a');
    expect(mocks.unmount).toHaveBeenCalledWith('Inventory', 'hotel-a');
    mocks.navigation.current = 'inventory';
    await nextTick();
    expect(container.textContent).toBe('Inventory:hotel-b:0');
    mocks.hotel.currentHotelId = 'hotel-a';
    await nextTick();
    mocks.navigation.current = 'orders';
    await nextTick();
    expect(container.textContent).toBe('Orders:hotel-a:0');
  });
});
