import {useCallback, useMemo} from 'react';
import {Alert, Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {printOnNetworkPrinter} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
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

const normalizePrintIds = value =>
  (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').replace(/\D+/g, '').trim())
    .filter(Boolean);

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
      const deviceType = String(deviceConfig?.device?.type || '')
        .trim()
        .toUpperCase();

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

  const printerDeviceId = useMemo(
    () =>
      normalizeDeviceId(
        parseConfigsObject(effectiveDeviceConfig?.configs)?.[
          DISPLAY_DEVICE_PRINTER_CONFIG_KEY
        ],
      ),
    [effectiveDeviceConfig?.configs],
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
        printer => normalizeDeviceId(printer?.device) === printerDeviceId,
      ) || null,
    [printerDeviceId, printerOptions],
  );

  const canPrint = Boolean(managerDeviceId && printerDeviceId && attachedPrinter);
  const isNetworkPrinter = isPrinterDeviceType(attachedPrinter?.type);
  const shouldDispatchSelectedDisplayThroughBackend = Boolean(
    selectedDisplayId &&
      managerDeviceId &&
      (Platform.OS === 'web' ||
        (currentDeviceId && managerDeviceId !== currentDeviceId)),
  );
  const shouldDispatchSocketPrinterThroughBackend = Boolean(
    !isNetworkPrinter &&
      managerDeviceId &&
      printerDeviceId &&
      currentDeviceId &&
      printerDeviceId !== currentDeviceId,
  );
  const shouldDispatchThroughBackend =
    shouldDispatchSelectedDisplayThroughBackend ||
    shouldDispatchSocketPrinterThroughBackend;

  const printToAttachedPrinter = useCallback(
    async ({orderId, queueIds = [], orderProductQueueIds = []}) => {
      const normalizedOrderId = String(orderId || '').replace(/\D+/g, '').trim();
      if (!canPrint || !normalizedOrderId) {
        return false;
      }

      const normalizedQueueIds = normalizePrintIds(queueIds);
      const normalizedOrderProductQueueIds =
        normalizePrintIds(orderProductQueueIds);

      if (shouldDispatchThroughBackend) {
        try {
          await printActions.printOrder({
            id: normalizedOrderId,
            device: managerDeviceId,
            ...(normalizedQueueIds.length > 0
              ? {queueIds: normalizedQueueIds}
              : {}),
            ...(normalizedOrderProductQueueIds.length > 0
              ? {orderProductQueueIds: normalizedOrderProductQueueIds}
              : {}),
          });
          return true;
        } catch (error) {
          Alert.alert('Impressao', resolveErrorMessage(error));
          return false;
        }
      }

      if (!isNetworkPrinter) {
        printActions.addToPrint({
          printType: 'order',
          id: normalizedOrderId,
          device: printerDeviceId,
          ...(normalizedQueueIds.length > 0
            ? {queueIds: normalizedQueueIds}
            : {}),
          ...(normalizedOrderProductQueueIds.length > 0
            ? {orderProductQueueIds: normalizedOrderProductQueueIds}
            : {}),
        });
        return true;
      }

      const printerHost = getPrinterHost(attachedPrinter);
      if (!printerHost) {
        Alert.alert(
          'Impressao',
          'A impressora vinculada nao possui IP ou hostname configurado.',
        );
        return false;
      }

      const printerPort = normalizePrinterPort(
        attachedPrinter?.configs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
          DEFAULT_NETWORK_PRINTER_PORT,
      );

      try {
        const spoolData = await printActions.printOrder({
          id: normalizedOrderId,
          device: printerDeviceId,
          ...(normalizedQueueIds.length > 0
            ? {queueIds: normalizedQueueIds}
            : {}),
          ...(normalizedOrderProductQueueIds.length > 0
            ? {orderProductQueueIds: normalizedOrderProductQueueIds}
            : {}),
        });
        const spoolContent = spoolData?.file?.content;

        if (!spoolContent) {
          throw new Error('Nao foi possivel gerar o conteudo da impressao.');
        }

        await printOnNetworkPrinter({
          host: printerHost,
          port: printerPort,
          payload: spoolContent,
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
      canPrint,
      isNetworkPrinter,
      managerDeviceId,
      printActions,
      printerDeviceId,
      shouldDispatchThroughBackend,
    ],
  );

  return {
    attachedPrinter,
    canPrint,
    isNetworkPrinter,
    printToAttachedPrinter,
  };
};
