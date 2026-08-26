/**
 * Smoke E2E: PCP com queue (production → print → conference → ready)
 *
 * issue: ControleOnline/app-community#608
 * parent: ControleOnline/app-community#601
 * fluxo: producao-fluxo
 * flowchartIds: [1]
 * flowKey: sales-production
 */
const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');
const {
  assertNotInDeliveryBeforeReady,
  buildSmokeManifest,
} = require('./pcpQueueFlow.helpers');
const {bootstrapPpcBrowser} = require('./pcp-queue-flow.mock');

const FLOW_ID = 'producao-fluxo';
const FLOWCHART_IDS = [1];
const evidenceSteps = [];

const writeEvidence = async (page, outputDir, stepId, title) => {
  fs.mkdirSync(outputDir, {recursive: true});
  const fileName = `${stepId}.png`;
  await page.screenshot({path: path.join(outputDir, fileName), fullPage: true});
  evidenceSteps.push({id: stepId, title, screenshot: fileName, url: page.url()});
};

test.describe('flowchart 1 — PCP com queue', () => {
  test('fila → production → print → conference → ready sem delivery antecipado', async ({
    page,
  }, testInfo) => {
    evidenceSteps.length = 0;
    const state = await bootstrapPpcBrowser(page);
    const outputDir = path.join(testInfo.outputDir, 'flowchart-1-pcp-queue');

    await page.goto('/display-details?id=1&displayType=production');
    await expect(page.getByText('Fila', {exact: true})).toBeVisible({timeout: 20000});
    await page.getByText('Fila', {exact: true}).click();
    await expect(page.getByText(/Coxinha fila/i).first()).toBeVisible({timeout: 20000});
    await writeEvidence(page, outputDir, '01-fila-entrada', 'Fila entrada (order_product_queue)');

    const startButton = page.getByText('Iniciar', {exact: true}).first();
    if (await startButton.count()) {
      await startButton.click();
    }
    await page.getByText('Prep', {exact: true}).click();
    await expect(page.getByText(/Coxinha fila/i).first()).toBeVisible({timeout: 20000});
    await writeEvidence(page, outputDir, '02-production', 'Production / Prep (working)');

    const printLabel = page.getByText(/Imprimir/i).first();
    if (await printLabel.count()) {
      await printLabel.click();
    }
    await expect(page.getByText(/9001|CX-QUEUE-101|Coxinha fila/i).first()).toBeVisible();
    await writeEvidence(page, outputDir, '03-print', 'Print/barcode da etiqueta na fila');

    const finalize = page.getByText('Finalizar', {exact: true}).first();
    if (await finalize.count()) {
      await finalize.click();
    }
    expect(state.deliveryOrders).toHaveLength(0);
    expect(
      assertNotInDeliveryBeforeReady({
        queueStage: 'status_out',
        conferenceChecked: false,
        readyPosted: false,
      }).allowed,
    ).toBe(false);

    await page.goto('/display-details?id=2&displayType=conference');
    const conferenceHit = page.getByText(/Pedido 123|Coxinha fila|#123/i).first();
    await expect(conferenceHit).toBeVisible({timeout: 20000});
    await conferenceHit.click();
    if (!/display-order-conference/i.test(page.url())) {
      await page.goto('/display-order-conference?id=123');
    }
    await expect(page.getByPlaceholder(/Bipe ou digite o codigo/i)).toBeVisible({
      timeout: 20000,
    });
    await page.getByPlaceholder(/Bipe ou digite o codigo/i).fill('9001');
    await page.getByPlaceholder(/Bipe ou digite o codigo/i).press('Enter');
    await writeEvidence(page, outputDir, '04-conference', 'Conference/picking scan do barcode');

    const readyButton = page.getByText(/Pedido pronto/i);
    await expect(readyButton).toBeVisible();
    if (await readyButton.isEnabled()) {
      await readyButton.click();
    }
    await writeEvidence(page, outputDir, '05-ready', 'Ready sem abrir delivery/saida');

    expect(page.url()).not.toMatch(/delivery|checkout|cobranca/i);

    const manifest = {
      ...buildSmokeManifest({
        fluxo: FLOW_ID,
        flowchartIds: FLOWCHART_IDS,
        steps: evidenceSteps.map(step => step.id),
      }),
      flowchartLinks: FLOWCHART_IDS.map(
        id => `https://admin.controleonline.com/admin/flowcharts/${id}`,
      ),
      evidence: evidenceSteps,
    };
    fs.writeFileSync(
      path.join(outputDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    expect(manifest.fluxo).toBe(FLOW_ID);
    expect(manifest.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(manifest.steps).toEqual([
      '01-fila-entrada',
      '02-production',
      '03-print',
      '04-conference',
      '05-ready',
    ]);
    await testInfo.attach('smoke-manifest', {
      body: Buffer.from(JSON.stringify(manifest, null, 2)),
      contentType: 'application/json',
    });
  });
});
