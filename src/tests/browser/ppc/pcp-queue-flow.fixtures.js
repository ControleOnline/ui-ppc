const packageJson = require('../../../../../../../package.json');
const {
  createQueueItem,
  createQueueProduct,
} = require('./pcpQueueFlow.helpers');

const APP_VERSION = packageJson?.version || '1.0.0';

const createCompany = () => ({
  id: 3,
  name: 'Restaurante Centro',
  alias: 'Centro',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#F97316',
    },
  },
  configs: {},
});

const createFakeSession = () => ({
  id: 7,
  people: '/people/7',
  api_key: 'test-api-key',
  active: 1,
  mycompany: 3,
  roles: ['ROLE_ADMIN'],
});

const createDevice = () => ({
  id: 'web-7',
  device: 'web-7',
  type: 'DISPLAY',
  appVersion: APP_VERSION,
  buildNumber: APP_VERSION,
});

const STATUS_IN = {id: 801, '@id': '/statuses/801', status: 'entrada'};
const STATUS_WORKING = {id: 802, '@id': '/statuses/802', status: 'working'};
const STATUS_OUT = {id: 803, '@id': '/statuses/803', status: 'produced'};
const STATUS_READY = {id: 804, '@id': '/statuses/804', status: 'ready'};

const QUEUE = {
  id: 1,
  queue: 'Cozinha',
  status_in: STATUS_IN,
  status_working: STATUS_WORKING,
  status_out: STATUS_OUT,
};

const createQueuedProduct = () =>
  createQueueProduct({
    id: 101,
    product: 'Coxinha fila',
    sku: 'CX-QUEUE-101',
    queue: QUEUE,
  });

const createInitialQueueItem = () =>
  createQueueItem({
    id: 9001,
    barcode: '9001',
    orderId: 123,
    orderLabel: 'Pedido 123',
    status: STATUS_IN,
    product: createQueuedProduct(),
  });

const createProductionDisplay = () => ({
  id: 1,
  display: 'Cozinha',
  displayType: 'production',
  company: 3,
});

const createConferenceDisplay = () => ({
  id: 2,
  display: 'Balcao',
  displayType: 'conference',
  company: 3,
});

const createTrackingDisplay = () => ({
  id: 3,
  display: 'Saida',
  displayType: 'tracking',
  company: 3,
});

const createDisplayQueueBinding = () => ({
  id: 11,
  display: 1,
  queue: QUEUE,
});

const createPaidOrder = (queueItem) => ({
  id: 123,
  '@id': '/orders/123',
  order: 'Pedido 123',
  client: {id: 9, name: 'Cliente Balcao'},
  status: {id: 902, status: 'paid', color: '#16A34A'},
  orderProducts: [
    {
      id: 501,
      quantity: 1,
      product: queueItem.order_product.product,
      status: {status: 'open', color: '#64748B'},
      orderProductQueues: [{id: 9001, '@id': '/order_product_queues/9001'}],
    },
  ],
});

module.exports = {
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
  createQueuedProduct,
  createTrackingDisplay,
};
