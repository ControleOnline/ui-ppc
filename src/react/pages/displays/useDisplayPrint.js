import {useCallback, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  decodeNetworkPrinterPayload,
  isNetworkPrinterRuntimeSupported,
  printOnNetworkPrinter,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DISPLAY_DEVICE_TYPE,
  getPrinterHost,
  getPrinterOptions,
  isPrinterDeviceType,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const DISPLAY_DEVICE_LINK_CONFIG_KEY = 'display-id';
const DISPLAY_DEVICE_PRINTER_CONFIG_KEY = 'printer';
const PRINT_JOB_TYPE_ORDER = 'order';
const PRINT_JOB_TYPE_ORDER_PRODUCT = 'order-product';
const getDeviceConfigType = deviceConfig =>
  String(deviceConfig?.type || deviceConfig?.device?.type || '')
    .trim()
    .toUpperCase();

const normalizePrintIds = value =>
  (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').replace(/\D+/g, '').trim())
    .filter(Boolean);

const normalizeOrderPrintRequest = ({
  orderId,
  queueIds = [],
} = {}) => {
  const normalizedOrderId = String(orderId || '').replace(/\D+/g, '').trim();
  if (!normalizedOrderId) {
    return null;
  }

  return {
    orderId: normalizedOrderId,
    queueIds: normalizePrintIds(queueIds),
  };
};

const normalizeOrderProductPrintRequest = ({
  orderProductId,
  orderProductQueueIds = [],
} = {}) => {
  const normalizedOrderProductId = String(orderProductId || '')
    .replace(/\D+/g, '')
    .trim();

  if (!normalizedOrderProductId) {
    return null;
  }

  return {
    orderProductId: normalizedOrderProductId,
    orderProductQueueIds: normalizePrintIds(orderProductQueueIds),
  };
};

const resolveErrorMessage = error =>
  error?.response?.data?.['hydra:description'] ||
  error?.response?.data?.message ||
  error?.message ||
  'Nao foi possivel concluir a impressao.';

const resolveDisplayDeviceConfig = ({
  deviceConfigs = [],
  companyId,
  currentDeviceId,
  displayId,
}) => {
  const normalizedDisplayId = normalizeEntityId(displayId);
  if (!normalizedDisplayId) {
    return null;
  }

  const matchingConfigs = filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => {
      const deviceType = getDeviceConfigType(deviceConfig);

      if (deviceType !== DISPLAY_DEVICE_TYPE) {
        return false;
      }

      const configs = parseConfigsObject(deviceConfig?.configs);
      return (
        normalizeEntityId(configs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]) ===
        normalizedDisplayId
      );
    });

  if (matchingConfigs.length === 0) {
    return null;
  }

  return (
    matchingConfigs.find(
      deviceConfig =>
        normalizeDeviceId(deviceConfig?.device?.device) ===
        normalizeDeviceId(currentDeviceId),
    ) ||
    matchingConfigs.find(deviceConfig =>
      normalizeDeviceId(
        parseConfigsObject(deviceConfig?.configs)?.[
          DISPLAY_DEVICE_PRINTER_CONFIG_KEY
        ],
      ),
    ) ||
    matchingConfigs[0]
  );
};

export const useDisplayPrint = ({display = null} = {}) => {
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const printerStore = useStore('printer');
  const printStore = useStore('print');

  const {currentCompany} = peopleStore.getters;
  const {item: currentDevice} = deviceStore.getters;
  const {item: runtimeDeviceConfig, items: companyDeviceConfigs = []} =
    deviceConfigStore.getters;
  const {items: printers = []} = printerStore.getters;

  const deviceConfigActions = deviceConfigStore.actions;
  const printerActions = printerStore.actions;
  const printActions = printStore.actions;
  const currentDeviceId = normalizeDeviceId(
    currentDevice?.id || currentDevice?.device,
  );
  const [isPrinterSelectionVisible, setPrinterSelectionVisible] = useState(false);
  const [isSavingPrinterSelection, setIsSavingPrinterSelection] = useState(false);
  const [selectedPrinterDeviceIdOverride, setSelectedPrinterDeviceIdOverride] =
    useState('');
  const [pendingPrintRequest, setPendingPrintRequest] = useState(null);
  const selectedDisplayId = useMemo(
    () => normalizeEntityId(display?.id || display?.['@id'] || display),
    [display],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) {
        return;
      }

      deviceConfigActions
        .getItems({people: `/people/${currentCompany.id}`})
        .catch(() => {});
      printerActions.getPrinters({people: currentCompany.id}).catch(() => {});
    }, [currentCompany?.id, deviceConfigActions, printerActions]),
  );

  const linkedDisplayDeviceConfig = useMemo(
    () =>
      resolveDisplayDeviceConfig({
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
        currentDeviceId,
        displayId: selectedDisplayId,
      }),
    [companyDeviceConfigs, currentCompany?.id, currentDeviceId, selectedDisplayId],
  );

  const effectiveDeviceConfig = useMemo(() => {
    if (selectedDisplayId) {
      return linkedDisplayDeviceConfig;
    }

    if (runtimeDeviceConfig?.configs) {
      return runtimeDeviceConfig;
    }

    if (!currentDeviceId) {
      return null;
    }

    return (
      (Array.isArray(companyDeviceConfigs) ? companyDeviceConfigs : []).find(
        deviceConfig =>
          normalizeDeviceId(deviceConfig?.device?.device) === currentDeviceId,
      ) || null
    );
  }, [
    currentDeviceId,
    companyDeviceConfigs,
    linkedDisplayDeviceConfig,
    runtimeDeviceConfig,
    selectedDisplayId,
  ]);
  const managerDeviceId = useMemo(
    () => normalizeDeviceId(effectiveDeviceConfig?.device?.device),
    [effectiveDeviceConfig?.device?.device],
  );
  const resolvedManagerDeviceId = useMemo(
    () => normalizeDeviceId(managerDeviceId || currentDeviceId),
    [currentDeviceId, managerDeviceId],
  );

  const configuredPrinterDeviceId = useMemo(
    () =>
      normalizeDeviceId(
        parseConfigsObject(effectiveDeviceConfig?.configs)?.[
          DISPLAY_DEVICE_PRINTER_CONFIG_KEY
        ],
      ),
    [effectiveDeviceConfig?.configs],
  );
  const selectedPrinterDeviceId = useMemo(
    () =>
      normalizeDeviceId(
        selectedPrinterDeviceIdOverride || configuredPrinterDeviceId,
      ),
    [configuredPrinterDeviceId, selectedPrinterDeviceIdOverride],
  );

  const printerOptions = useMemo(
    () =>
      getPrinterOptions({
        printers,
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );

  const attachedPrinter = useMemo(
    () =>
      printerOptions.find(
        printer => normalizeDeviceId(printer?.device) === selectedPrinterDeviceId,
      ) || null,
    [printerOptions, selectedPrinterDeviceId],
  );

  const canPrint = Boolean(selectedPrinterDeviceId && attachedPrinter);
  const isNetworkPrinter = isPrinterDeviceType(attachedPrinter?.type);
  const configTargetDeviceId = useMemo(
    () =>
      normalizeDeviceId(
        effectiveDeviceConfig?.device?.device ||
          effectiveDeviceConfig?.device?.id ||
          currentDeviceId ||
          managerDeviceId,
      ),
    [
      currentDeviceId,
      effectiveDeviceConfig?.device?.device,
      effectiveDeviceConfig?.device?.id,
      managerDeviceId,
    ],
  );
  const configTargetDeviceType = useMemo(
    () => getDeviceConfigType(effectiveDeviceConfig),
    [effectiveDeviceConfig],
  );

  const closePrinterSelection = useCallback(() => {
    if (isSavingPrinterSelection) {
      return;
    }

    setPrinterSelectionVisible(false);
    setPendingPrintRequest(null);
  }, [isSavingPrinterSelection]);

  const openPrinterSelection = useCallback(pendingJob => {
    if (pendingJob) {
      setPendingPrintRequest(pendingJob);
    }

    setPrinterSelectionVisible(true);
  }, []);

  const executePrintJob = useCallback(
    async ({jobType, request, overrides = {}}) => {
      const normalizedRequest =
        jobType === PRINT_JOB_TYPE_ORDER_PRODUCT
          ? normalizeOrderProductPrintRequest(request)
          : normalizeOrderPrintRequest(request);

      if (!normalizedRequest) {
        return false;
      }

      const targetPrinterDeviceId = normalizeDeviceId(
        overrides.printerDeviceId || selectedPrinterDeviceId,
      );
      const targetAttachedPrinter = overrides.attachedPrinter || attachedPrinter;
      const targetManagerDeviceId = normalizeDeviceId(
        overrides.managerDeviceId || resolvedManagerDeviceId,
      );

      if (!targetPrinterDeviceId || !targetAttachedPrinter) {
        openPrinterSelection({
          jobType,
          request: normalizedRequest,
        });
        return false;
      }

      const targetIsNetworkPrinter = isPrinterDeviceType(
        targetAttachedPrinter?.type,
      );
      const shouldDispatchSelectedDisplayThroughBackend = Boolean(
        selectedDisplayId &&
          targetManagerDeviceId &&
          currentDeviceId &&
          targetManagerDeviceId !== currentDeviceId,
      );
      const shouldDispatchSocketPrinterThroughBackend = Boolean(
        !targetIsNetworkPrinter &&
          targetManagerDeviceId &&
          targetPrinterDeviceId &&
          currentDeviceId &&
          targetPrinterDeviceId !== currentDeviceId,
      );
      const shouldDispatchThroughBackend =
        shouldDispatchSelectedDisplayThroughBackend ||
        shouldDispatchSocketPrinterThroughBackend;

      if (shouldDispatchThroughBackend) {
        try {
          if (jobType === PRINT_JOB_TYPE_ORDER_PRODUCT) {
            await printActions.printOrderProduct({
              id: normalizedRequest.orderProductId,
              device: targetManagerDeviceId,
              type: configTargetDeviceType,
              ...(normalizedRequest.orderProductQueueIds.length > 0
                ? {orderProductQueueIds: normalizedRequest.orderProductQueueIds}
                : {}),
            });
          } else {
            await printActions.printOrder({
              id: normalizedRequest.orderId,
              device: targetManagerDeviceId,
              type: configTargetDeviceType,
              ...(normalizedRequest.queueIds.length > 0
                ? {queueIds: normalizedRequest.queueIds}
                : {}),
            });
          }
          return true;
        } catch (error) {
          Alert.alert('Impressao', resolveErrorMessage(error));
          return false;
        }
      }

      if (!targetIsNetworkPrinter) {
        if (jobType === PRINT_JOB_TYPE_ORDER_PRODUCT) {
          printActions.addToPrint({
            printType: PRINT_JOB_TYPE_ORDER_PRODUCT,
            id: normalizedRequest.orderProductId,
            orderProductId: normalizedRequest.orderProductId,
            device: targetPrinterDeviceId,
            deviceType: targetAttachedPrinter?.type,
            ...(normalizedRequest.orderProductQueueIds.length > 0
              ? {orderProductQueueIds: normalizedRequest.orderProductQueueIds}
              : {}),
          });
        } else {
          printActions.addToPrint({
            printType: PRINT_JOB_TYPE_ORDER,
            id: normalizedRequest.orderId,
            orderId: normalizedRequest.orderId,
            device: targetPrinterDeviceId,
            deviceType: targetAttachedPrinter?.type,
            ...(normalizedRequest.queueIds.length > 0
              ? {queueIds: normalizedRequest.queueIds}
              : {}),
          });
        }
        return true;
      }

      if (!isNetworkPrinterRuntimeSupported) {
        Alert.alert(
          'Impressao',
          'Impressora IP precisa ser usada no app nativo deste KDS.',
        );
        return false;
      }

      const printerHost = getPrinterHost(targetAttachedPrinter);
      if (!printerHost) {
        Alert.alert(
          'Impressao',
          'A impressora vinculada nao possui IP ou hostname configurado.',
        );
        return false;
      }

      const printerPort = normalizePrinterPort(
        targetAttachedPrinter?.configs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
          DEFAULT_NETWORK_PRINTER_PORT,
      );

      try {
        const spoolData =
          jobType === PRINT_JOB_TYPE_ORDER_PRODUCT
            ? await printActions.printOrderProduct({
                id: normalizedRequest.orderProductId,
                device: targetPrinterDeviceId,
                type: targetAttachedPrinter?.type,
                ...(normalizedRequest.orderProductQueueIds.length > 0
                  ? {orderProductQueueIds: normalizedRequest.orderProductQueueIds}
                  : {}),
              })
            : await printActions.printOrder({
                id: normalizedRequest.orderId,
                device: targetPrinterDeviceId,
                type: targetAttachedPrinter?.type,
                ...(normalizedRequest.queueIds.length > 0
                  ? {queueIds: normalizedRequest.queueIds}
                  : {}),
              });
        const spoolContent = spoolData?.file?.content;

        if (!spoolContent) {
          throw new Error('Nao foi possivel gerar o conteudo da impressao.');
        }

        await printOnNetworkPrinter({
          host: printerHost,
          port: printerPort,
          payload: decodeNetworkPrinterPayload(spoolContent),
        });

        if (spoolData?.id) {
          await printActions.makePrintDone(spoolData.id);
        }

        return true;
      } catch (error) {
        Alert.alert('Impressao', resolveErrorMessage(error));
        return false;
      }
    },
    [
      attachedPrinter,
      configTargetDeviceType,
      currentDeviceId,
      openPrinterSelection,
      printActions,
      resolvedManagerDeviceId,
      selectedDisplayId,
      selectedPrinterDeviceId,
    ],
  );

  const handleSelectPrinter = useCallback(
    async printer => {
      const nextPrinterDeviceId = normalizeDeviceId(printer?.device);
      if (!nextPrinterDeviceId) {
        Alert.alert('Impressao', 'Selecione uma impressora valida.');
        return false;
      }

      if (!currentCompany?.id) {
        Alert.alert('Impressao', 'Nao foi possivel identificar a empresa ativa.');
        return false;
      }

      if (!configTargetDeviceId) {
        Alert.alert(
          'Impressao',
          'Nao foi possivel identificar o device deste display.',
        );
        return false;
      }

      setIsSavingPrinterSelection(true);

      const selectedPrinter =
        printerOptions.find(
          option => normalizeDeviceId(option?.device) === nextPrinterDeviceId,
        ) || printer;

      try {
        await deviceConfigActions.addDeviceConfigs({
          device: configTargetDeviceId,
          people: `/people/${currentCompany.id}`,
          type: configTargetDeviceType,
          configs: JSON.stringify({
            [DISPLAY_DEVICE_PRINTER_CONFIG_KEY]: nextPrinterDeviceId,
            ...(selectedDisplayId
              ? {[DISPLAY_DEVICE_LINK_CONFIG_KEY]: selectedDisplayId}
              : {}),
          }),
        });

        setSelectedPrinterDeviceIdOverride(nextPrinterDeviceId);
        setPrinterSelectionVisible(false);

        deviceConfigActions
          .getItems({people: `/people/${currentCompany.id}`})
          .catch(() => {});

        const queuedPrintJob = pendingPrintRequest;
        setPendingPrintRequest(null);

        if (queuedPrintJob?.jobType && queuedPrintJob?.request) {
          return executePrintJob({
            ...queuedPrintJob,
            overrides: {
              attachedPrinter: selectedPrinter,
              printerDeviceId: nextPrinterDeviceId,
              managerDeviceId: configTargetDeviceId,
            },
          });
        }

        return true;
      } catch (error) {
        Alert.alert('Impressao', resolveErrorMessage(error));
        return false;
      } finally {
        setIsSavingPrinterSelection(false);
      }
    },
    [
      configTargetDeviceId,
      configTargetDeviceType,
      currentCompany?.id,
      deviceConfigActions,
      executePrintJob,
      pendingPrintRequest,
      printerOptions,
      selectedDisplayId,
    ],
  );

  const printOrderToAttachedPrinter = useCallback(
    async request =>
      executePrintJob({
        jobType: PRINT_JOB_TYPE_ORDER,
        request,
      }),
    [executePrintJob],
  );

  const printOrderProductToAttachedPrinter = useCallback(
    async request =>
      executePrintJob({
        jobType: PRINT_JOB_TYPE_ORDER_PRODUCT,
        request,
      }),
    [executePrintJob],
  );

  return {
    attachedPrinter,
    canPrint,
    isNetworkPrinter,
    isPrinterSelectionVisible,
    isSavingPrinterSelection,
    closePrinterSelection,
    handleSelectPrinter,
    openPrinterSelection,
    printOrderToAttachedPrinter,
    printOrderProductToAttachedPrinter,
    printerOptions,
    selectedPrinterDeviceId,
  };
};
