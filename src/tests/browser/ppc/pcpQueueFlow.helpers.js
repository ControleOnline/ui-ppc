/**
 * Shared helpers for app-community#608 PCP-with-queue smoke.
 * fluxo: producao-fluxo
 * flowchartIds: [1]
 */

const QUEUE_STAGES = {
  entrada: 'status_in',
  production: 'status_working',
  produced: 'status_out',
};

const READY_STAGE = 'ready';
const DELIVERY_STAGE = 'delivery';

const STAGE_ORDER = [
  QUEUE_STAGES.entrada,
  QUEUE_STAGES.production,
  QUEUE_STAGES.produced,
  READY_STAGE,
  DELIVERY_STAGE,
];

const createQueueProduct = (overrides = {}) => ({
  id: overrides.id || 101,
  product: overrides.product || 'Coxinha fila',
  sku: overrides.sku || 'CX-QUEUE-101',
  type: 'product',
  price: overrides.price || 12.5,
  quantity: overrides.quantity || 1,
  productQueue: true,
  queue: overrides.queue || {
    id: 1,
    queue: 'Cozinha',
    status_in: {id: 801, '@id': '/statuses/801', status: 'entrada'},
    status_working: {id: 802, '@id': '/statuses/802', status: 'working'},
    status_out: {id: 803, '@id': '/statuses/803', status: 'produced'},
  },
});

const createQueueItem = (overrides = {}) => {
  const product = createQueueProduct(overrides.product || {});
  const queueId = overrides.id || 9001;
  const status = overrides.status || product.queue.status_in;

  return {
    id: queueId,
    '@id': `/order_product_queues/${queueId}`,
    barcode: overrides.barcode || String(queueId),
    status,
    queue: product.queue,
    order_product: {
      id: overrides.orderProductId || 501,
      quantity: product.quantity,
      product,
      order: {
        id: overrides.orderId || 123,
        '@id': `/orders/${overrides.orderId || 123}`,
        order: overrides.orderLabel || 'Pedido 123',
        status: {status: 'paid', color: '#16A34A'},
      },
      orderProductQueues: [{id: queueId, '@id': `/order_product_queues/${queueId}`}],
    },
  };
};

const stageIndex = stage => STAGE_ORDER.indexOf(stage);

const canEnterDelivery = ({queueStage, conferenceChecked, readyPosted} = {}) =>
  queueStage === READY_STAGE &&
  conferenceChecked === true &&
  readyPosted === true;

const assertNotInDeliveryBeforeReady = state => {
  if (canEnterDelivery(state)) {
    return {allowed: true, reason: 'ready'};
  }

  return {
    allowed: false,
    reason: 'item-must-not-reach-delivery-or-saida-before-ready',
  };
};

const applyQueueTransition = (item, nextStatus) => {
  if (!item || !nextStatus) {
    throw new Error('queue transition requires item and status');
  }

  return {
    ...item,
    status: nextStatus,
  };
};

const filterQueueByStatus = (items, statusId) =>
  (Array.isArray(items) ? items : []).filter(item => {
    const currentId = item?.status?.id || item?.status;
    return String(currentId) === String(statusId);
  });

const buildSmokeManifest = ({
  fluxo = 'producao-fluxo',
  flowchartIds = [1],
  steps = [],
} = {}) => ({
  fluxo,
  flowchartIds,
  issue: 'ControleOnline/app-community#608',
  steps,
});

module.exports = {
  QUEUE_STAGES,
  READY_STAGE,
  DELIVERY_STAGE,
  STAGE_ORDER,
  applyQueueTransition,
  assertNotInDeliveryBeforeReady,
  buildSmokeManifest,
  canEnterDelivery,
  createQueueItem,
  createQueueProduct,
  filterQueueByStatus,
  stageIndex,
};
