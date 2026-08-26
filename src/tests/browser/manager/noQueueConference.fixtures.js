const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const PRODUCT_NAME = 'Suco Sem Fila';
const PRODUCT_SKU = 'SKU-SEM-FILA';
const ORDER_ID = 321;
const ORDER_PRODUCT_ID = 11;
const PRODUCTION_DISPLAY_ID = 1;
const CONFERENCE_DISPLAY_ID = 2;

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const createOrderProduct = ({checked = false} = {}) => ({
  '@id': `/order_products/${ORDER_PRODUCT_ID}`,
  id: ORDER_PRODUCT_ID,
  quantity: 1,
  product: {
    '@id': '/products/88',
    id: 88,
    product: PRODUCT_NAME,
    sku: PRODUCT_SKU,
  },
  status: {
    status: checked ? 'conferido' : 'open',
    color: checked ? '#16A34A' : '#64748B',
  },
  orderProductQueues: [],
});

const createSaleOrder = ({checked = false, status = 'open'} = {}) => ({
  '@id': `/orders/${ORDER_ID}`,
  id: ORDER_ID,
  orderType: 'sale',
  status: {
    status,
    realStatus: status,
    color: status === 'ready' ? '#16A34A' : '#0EA5E9',
  },
  client: {name: 'Cliente Balcao'},
  orderProducts: [createOrderProduct({checked})],
});

const productionDisplay = {
  '@id': `/displays/${PRODUCTION_DISPLAY_ID}`,
  id: PRODUCTION_DISPLAY_ID,
  display: 'Cozinha',
  displayType: 'production',
};

const conferenceDisplay = {
  '@id': `/displays/${CONFERENCE_DISPLAY_ID}`,
  id: CONFERENCE_DISPLAY_ID,
  display: 'Balcao',
  displayType: 'conference',
};

const createSmokeState = () => ({
  orderChecked: false,
  orderReady: false,
  productionQueueMutations: [],
  productionQueueReads: [],
  readyPosts: [],
  conferenceReads: [],
  checkPosts: [],
  visitedPaths: [],
});

const pathnameOf = url => {
  try {
    return new URL(url).pathname.replace(/^\/+/, '');
  } catch {
    return String(url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\/+/, '');
  }
};

const bindNoQueueConferenceApi = async (page, state = createSmokeState()) => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const pathname = pathnameOf(request.url());
    state.visitedPaths.push(`${method} /${pathname}`);

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    const isProductionQueuePath =
      pathname === 'order_product_queues' ||
      pathname.startsWith('order_product_queues/') ||
      pathname === 'order_products_queue' ||
      pathname.startsWith('order_products_queue/');

    if (isProductionQueuePath) {
      if (method === 'GET') {
        state.productionQueueReads.push(pathname);
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(collection([])),
        });
      }
      state.productionQueueMutations.push(`${method} /${pathname}`);
      return route.fulfill({
        status: 400,
        headers: jsonHeaders(),
        body: JSON.stringify({
          description: 'Produto sem production queue nao deve entrar em order_product_queue',
        }),
      });
    }

    if (pathname === `orders/${ORDER_ID}/conference` && method === 'GET') {
      state.conferenceReads.push(pathname);
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          createSaleOrder({
            checked: state.orderChecked,
            status: state.orderReady ? 'ready' : 'open',
          }),
        ),
      });
    }

    if (pathname === `order_products/${ORDER_PRODUCT_ID}/check` && method === 'POST') {
      state.checkPosts.push(pathname);
      state.orderChecked = true;
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createOrderProduct({checked: true})),
      });
    }

    if (pathname === `orders/${ORDER_ID}/ready` && method === 'POST') {
      state.readyPosts.push(pathname);
      state.orderReady = true;
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createSaleOrder({checked: true, status: 'ready'})),
      });
    }

    if (pathname === `orders/${ORDER_ID}` || pathname === `orders/${ORDER_ID}/`) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          createSaleOrder({
            checked: state.orderChecked,
            status: state.orderReady ? 'ready' : 'open',
          }),
        ),
      });
    }

    if (pathname === 'orders' || pathname.startsWith('orders')) {
      const members = state.orderReady ? [] : [createSaleOrder({checked: state.orderChecked})];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(members)),
      });
    }

    if (pathname === `displays/${PRODUCTION_DISPLAY_ID}`) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(productionDisplay),
      });
    }

    if (pathname === `displays/${CONFERENCE_DISPLAY_ID}`) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(conferenceDisplay),
      });
    }

    if (pathname === 'displays' || pathname.startsWith('displays')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([productionDisplay, conferenceDisplay])),
      });
    }

    if (pathname === 'companies' || pathname.startsWith('people/')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({id: 3, name: 'Teste', alias: 'TESTE', panel_enabled: true}),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  return state;
};

const bootstrapManagerBrowser = async page => {
  await page.addInitScript(
    ({appVersion}) => {
      const set = (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {}
      };
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 't',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      );
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'MANAGER');
      set(
        'device',
        JSON.stringify({
          id: 'web',
          device: 'web',
          type: 'WEB',
          appVersion,
          buildNumber: appVersion,
        }),
      );
    },
    {appVersion: APP_VERSION},
  );
};

module.exports = {
  API_ORIGIN,
  APP_VERSION,
  CONFERENCE_DISPLAY_ID,
  ORDER_ID,
  ORDER_PRODUCT_ID,
  PRODUCT_NAME,
  PRODUCT_SKU,
  PRODUCTION_DISPLAY_ID,
  bindNoQueueConferenceApi,
  bootstrapManagerBrowser,
  createSmokeState,
};
