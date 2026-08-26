/**
 * fluxo: producao-fluxo
 * flowchartIds: [1]
 * flowKey: sales-production
 * Parent: ControleOnline/app-community#609
 *
 * Checkpoint flowchart 1: product without production queue goes to
 * conference (no PCP bypass / no delivery before Ready).
 */
const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');
const {
  CONFERENCE_DISPLAY_ID,
  ORDER_ID,
  PRODUCT_NAME,
  PRODUCT_SKU,
  PRODUCTION_DISPLAY_ID,
  bindNoQueueConferenceApi,
  bootstrapManagerBrowser,
  createSmokeState,
} = require('./noQueueConference.fixtures');

const FLOW_ID = 'producao-fluxo';
const FLOWCHART_IDS = [1];
const FLOWCHART_LINKS = FLOWCHART_IDS.map(
  id => `https://admin.controleonline.com/admin/flowcharts/${id}`,
);

const evidenceSteps = [];

const writeEvidence = async (page, outputDir, stepId, title) => {
  fs.mkdirSync(outputDir, {recursive: true});
  const fileName = `${stepId}.png`;
  const filePath = path.join(outputDir, fileName);
  await page.screenshot({path: filePath, fullPage: true});
  evidenceSteps.push({
    id: stepId,
    title,
    screenshot: fileName,
    url: page.url(),
  });
  return filePath;
};

const writeManifest = outputDir => {
  const manifest = {
    fluxo: FLOW_ID,
    flowchartIds: FLOWCHART_IDS,
    flowchartLinks: FLOWCHART_LINKS,
    flowKey: 'sales-production',
    title: 'item sem queue vai para conference (sem bypass PCP)',
    steps: evidenceSteps,
  };
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
};

test.describe('flowchart 1 — item sem queue vai para conference', () => {
  test('pedido no PPC cai em conference e Ready sem order_product_queue', async ({
    page,
  }, testInfo) => {
    const state = createSmokeState();
    await bindNoQueueConferenceApi(page, state);
    await bootstrapManagerBrowser(page);

    const outputDir = path.join(testInfo.outputDir, 'flowchart-1-no-queue-conference');

    await page.goto(`/display-details?id=${PRODUCTION_DISPLAY_ID}`);
    await page.waitForTimeout(400);
    await expect(page.getByText(PRODUCT_NAME)).toHaveCount(0);
    await writeEvidence(
      page,
      outputDir,
      '01-production-sem-queue',
      'Display production nao lista o item sem queue',
    );

    await page.goto(`/display-details?id=${CONFERENCE_DISPLAY_ID}`);
    await expect(page.getByText(`#${ORDER_ID}`, {exact: false})).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/delivery|cobrança pendente|entregador/i)).toHaveCount(0);
    await writeEvidence(
      page,
      outputDir,
      '02-item-sem-queue-na-conference',
      'Pedido aparece no display de conference',
    );

    await page.getByText(`#${ORDER_ID}`, {exact: false}).first().click();
    if (!/display-order-conference/i.test(page.url())) {
      await page.goto(`/display-order-conference?id=${ORDER_ID}`);
    }
    await expect(page).toHaveURL(/display-order-conference/);
    await expect(page.getByText(PRODUCT_NAME, {exact: true})).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Conferencia', {exact: false})).toBeVisible();
    await expect(page.getByPlaceholder(/Bipe ou digite o codigo/i)).toBeVisible();
    await expect(page.getByText(/production queue|fila de produção|Cozinha/i)).toHaveCount(0);
    await writeEvidence(
      page,
      outputDir,
      '03-tela-conference',
      'Tela de conference (nao production queue)',
    );

    await page.getByPlaceholder(/Bipe ou digite o codigo/i).fill(PRODUCT_SKU);
    await page.getByPlaceholder(/Bipe ou digite o codigo/i).press('Enter');
    await expect.poll(() => state.checkPosts.length).toBeGreaterThan(0);

    const readyButton = page.getByText(/Pedido pronto/i);
    await expect(readyButton).toBeVisible();
    await readyButton.click();
    await expect.poll(() => state.readyPosts.length).toBe(1);

    await expect(page).not.toHaveURL(/deliver|checkout|cobranca/i);
    await writeEvidence(
      page,
      outputDir,
      '04-ready',
      'Pedido marcado Ready sem abrir delivery/cobranca',
    );

    expect(state.productionQueueMutations).toEqual([]);
    expect(state.conferenceReads.length).toBeGreaterThan(0);
    expect(state.readyPosts).toEqual([`orders/${ORDER_ID}/ready`]);
    expect(page.url()).not.toMatch(/delivery/i);

    const manifest = writeManifest(outputDir);
    expect(manifest.fluxo).toBe(FLOW_ID);
    expect(manifest.flowchartIds).toEqual([1]);
    expect(manifest.steps).toHaveLength(4);
    await testInfo.attach('smoke-manifest', {
      body: Buffer.from(JSON.stringify(manifest, null, 2)),
      contentType: 'application/json',
    });
  });
});
