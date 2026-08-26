const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {
  APP_VERSION,
  QUEUE,
  STATUS_IN,
  STATUS_OUT,
  STATUS_READY,
  STATUS_WORKING,
  createCompany,
  createConferenceDisplay,
  createDevice,
  createDisplayQueueBinding,
  createFakeSession,
  createInitialQueueItem,
  createPaidOrder,
  createProductionDisplay,
  createTrackingDisplay,
} = require('./pcp-queue-flow.fixtures');
const {
  applyQueueTransition,
  canEnterDelivery,
} = require('./pcpQueueFlow.helpers');

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const parseStatusFilter = searchParams => {
  const raw = searchParams.getAll('status').concat(searchParams.getAll('status[]'));
  if (!raw.length) {
    const single = searchParams.get('status');
    if (single) raw.push(single);
  }
  return raw
    .flatMap(value => String(value || '').split(','))
    .map(value => value.replace('/statuses/', ''))
    .filter(Boolean);
};

const createPcpQueueState = () => {
  const queueItem = createInitialQueueItem();
  return {
    company: createCompany(),
    session: createFakeSession(),
    device: createDevice(),
    displays: [
      createProductionDisplay(),
      createConferenceDisplay(),
      createTrackingDisplay(),
    ],
    displayQueues: [createDisplayQueueBinding()],
    queueItem,
    queueItems: [queueItem],
    order: createPaidOrder(queueItem),
    conferenceChecked: false,
    readyPosted: false,
    printJobs: [],
    statusSaves: [],
    deliveryOrders: [],
    checkPosts: [],
    readyPosts: [],
    deliveryReads: [],
  };
};

const matchesStatusFilter = (item, statusFilters) => {
  if (!statusFilters.length) return true;
  const statusId = String(item?.status?.id || item?.status || '');
  return statusFilters.some(filter =>
    statusId === String(filter) || String(item?.status?.['@id'] || '').endsWith(`/${filter}`),
  );
};

const registerPcpQueueApi = async (page, state) => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    const ok = body =>
      route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: {...CORS_HEADERS, 'content-type': 'text/css'},
        body: ':root { --primary: #0ea5e9; }',
      });
    }

    if (pathname === 'runtime/ip') {
      return ok({ip: '127.0.0.1'});
    }

    if (pathname === 'people/companies/my' || pathname === 'companies') {
      return ok(collection([state.company]));
    }

    if (pathname.startsWith('people/')) {
      return ok(state.company);
    }

    if (pathname === 'displays' || pathname.startsWith('displays?')) {
      return ok(collection(state.displays));
    }

    if (pathname === 'displays/1') {
      return ok(state.displays[0]);
    }

    if (pathname === 'displays/2') {
      return ok(state.displays[1]);
    }

    if (pathname === 'displays/3') {
      return ok(state.displays[2]);
    }

    if (pathname === 'display_queues' || pathname.startsWith('display_queues')) {
      return ok(collection(state.displayQueues));
    }

    if (pathname === 'queues' || pathname.startsWith('queues')) {
      return ok(collection([QUEUE]));
    }

    if (pathname === 'statuses' || pathname.startsWith('statuses')) {
      return ok(collection([STATUS_IN, STATUS_WORKING, STATUS_OUT, STATUS_READY]));
    }

    if (pathname === 'device_config' || pathname.startsWith('device_config')) {
      return ok(
        collection([
          {
            id: 1,
            type: 'DISPLAY',
            people: {id: 3},
            device: state.device,
            configs: JSON.stringify({
              'config-version': APP_VERSION,
              display: 1,
            }),
          },
          {
            id: 2,
            type: 'PRINT',
            people: {id: 3},
            device: {id: 'printer-1', device: 'printer-1', alias: 'Cozinha'},
            configs: JSON.stringify({'config-version': APP_VERSION}),
          },
        ]),
      );
    }

    if (pathname === 'order_product_queues' || pathname.startsWith('order_product_queues?')) {
      const statusFilters = parseStatusFilter(url.searchParams);
      const items = state.queueItems.filter(item => matchesStatusFilter(item, statusFilters));
      return ok(collection(items));
    }

    const queueMatch = pathname.match(/^order_product_queues\/(\d+)$/);
    if (queueMatch) {
      const queueId = Number(queueMatch[1]);
      const current = state.queueItems.find(item => Number(item.id) === queueId);
      if (method === 'GET') {
        return ok(current || state.queueItem);
      }

      const payload = request.postDataJSON() || {};
      const nextStatus =
        payload.status && typeof payload.status === 'object'
          ? payload.status
          : payload.status === STATUS_WORKING['@id'] || payload.status === 802 || payload.status === '802'
            ? STATUS_WORKING
            : payload.status === STATUS_OUT['@id'] || payload.status === 803 || payload.status === '803'
              ? STATUS_OUT
              : current?.status;
      const updated = applyQueueTransition(current || state.queueItem, nextStatus);
      state.queueItem = updated;
      state.queueItems = [updated];
      state.statusSaves.push({id: queueId, status: nextStatus, payload});
      return ok(updated);
    }

    if (pathname === 'orders/123' || pathname === 'orders/123/') {
      return ok(state.order);
    }

    if (pathname === 'orders/123/ready') {
      state.readyPosts.push(pathname);
      state.readyPosted = true;
      state.order = {
        ...state.order,
        status: STATUS_READY,
      };
      if (canEnterDelivery({
        queueStage: 'ready',
        conferenceChecked: state.conferenceChecked,
        readyPosted: true,
      })) {
        state.deliveryOrders = [{id: 123, order: 'Pedido 123', status: STATUS_READY}];
      }
      return ok({ok: true, id: 123, status: STATUS_READY});
    }

    if (pathname === 'orders' || pathname.startsWith('orders')) {
      const status = String(url.searchParams.get('status') || '');
      if (/deliver|saida|tracking|ready/i.test(status)) {
        state.deliveryReads.push(pathname + url.search);
        return ok(collection(state.deliveryOrders));
      }
      return ok(collection([state.order]));
    }

    if (pathname.includes('print') || pathname.includes('printer')) {
      state.printJobs.push({
        path: pathname,
        method,
        body: request.postDataJSON() || null,
      });
      return ok({ok: true, printed: true, barcode: state.queueItem.barcode});
    }

    if (
      pathname === 'order_products/501/check' ||
      pathname.startsWith('order_products/') && pathname.endsWith('/check')
    ) {
      state.checkPosts.push(pathname);
      state.conferenceChecked = true;
      state.order = {
        ...state.order,
        orderProducts: state.order.orderProducts.map(item => ({
          ...item,
          status: {status: 'conferido', color: '#16A34A'},
        })),
      };
      return ok(state.order.orderProducts[0]);
    }

    return ok(collection([]));
  });

  return state;
};

const bootstrapPpcBrowser = async page => {
  const state = createPcpQueueState();
  await registerPcpQueueApi(page, state);
  await page.addInitScript(
    ({session, device, appVersion}) => {
      const set = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {}
      };
      set('session', JSON.stringify(session));
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'PPC');
      set(
        'device',
        JSON.stringify({
          ...device,
          appVersion,
          buildNumber: appVersion,
        }),
      );
    },
    {
      session: state.session,
      device: state.device,
      appVersion: APP_VERSION,
    },
  );
  return state;
};

module.exports = {
  bootstrapPpcBrowser,
  collection,
  createPcpQueueState,
  jsonHeaders,
  registerPcpQueueApi,
};
