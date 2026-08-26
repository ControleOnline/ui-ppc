const {
  QUEUE_STAGES,
  READY_STAGE,
  applyQueueTransition,
  assertNotInDeliveryBeforeReady,
  buildSmokeManifest,
  canEnterDelivery,
  createQueueItem,
  filterQueueByStatus,
} = require('../../../../browser/ppc/pcpQueueFlow.helpers');

describe('pcpQueueFlow.helpers', () => {
  it('creates a fixture product with queue configured', () => {
    const item = createQueueItem();

    expect(item.order_product.product.productQueue).toBe(true);
    expect(item.order_product.product.queue.status_in.id).toBe(801);
    expect(item.barcode).toBe('9001');
    expect(item.order_product.orderProductQueues[0].id).toBe(9001);
  });

  it('moves the item entrada → working → produced', () => {
    const entrada = createQueueItem();
    const working = applyQueueTransition(entrada, {
      id: 802,
      '@id': '/statuses/802',
      status: 'working',
    });
    const produced = applyQueueTransition(working, {
      id: 803,
      '@id': '/statuses/803',
      status: 'produced',
    });

    expect(filterQueueByStatus([entrada], 801)).toHaveLength(1);
    expect(filterQueueByStatus([working], 802)).toHaveLength(1);
    expect(filterQueueByStatus([produced], 803)).toHaveLength(1);
    expect(working.status.status).toBe('working');
    expect(produced.status.status).toBe('produced');
  });

  it('blocks delivery/saida before Ready even after produced + conference', () => {
    expect(
      canEnterDelivery({
        queueStage: QUEUE_STAGES.produced,
        conferenceChecked: true,
        readyPosted: false,
      }),
    ).toBe(false);

    expect(
      assertNotInDeliveryBeforeReady({
        queueStage: QUEUE_STAGES.produced,
        conferenceChecked: true,
        readyPosted: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'item-must-not-reach-delivery-or-saida-before-ready',
    });
  });

  it('allows delivery only after conference checked and ready posted', () => {
    expect(
      canEnterDelivery({
        queueStage: READY_STAGE,
        conferenceChecked: true,
        readyPosted: true,
      }),
    ).toBe(true);
  });

  it('declares flowchart 1 and producao-fluxo on the smoke manifest', () => {
    const manifest = buildSmokeManifest({
      steps: ['fila-entrada', 'production', 'print', 'conference', 'ready'],
    });

    expect(manifest.fluxo).toBe('producao-fluxo');
    expect(manifest.flowchartIds).toEqual([1]);
    expect(manifest.issue).toBe('ControleOnline/app-community#608');
    expect(manifest.steps).toContain('print');
  });
});
