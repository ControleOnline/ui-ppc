import {useCallback, useMemo} from 'react';
import {Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {printOnNetworkPrinter} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  getPrinterHost,
  getPrinterOptions,
  isPrinterDeviceType,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';

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

export const useDisplayPrint = () => {
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

  const effectiveDeviceConfig = useMemo(() => {
    if (runtimeDeviceConfig?.configs) {
      return runtimeDeviceConfig;
    }

    const currentDeviceId = normalizeDeviceId(
      currentDevice?.id || currentDevice?.device,
    );

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
    companyDeviceConfigs,
    currentDevice?.device,
    currentDevice?.id,
    runtimeDeviceConfig,
  ]);

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

  const canPrint = Boolean(printerDeviceId && attachedPrinter);
  const isNetworkPrinter = isPrinterDeviceType(attachedPrinter?.type);

  const printToAttachedPrinter = useCallback(
    async ({orderId, orderProductQueueIds = []}) => {
      const normalizedOrderId = String(orderId || '').replace(/\D+/g, '').trim();
      if (!canPrint || !normalizedOrderId) {
        return false;
      }

      const normalizedOrderProductQueueIds =
        normalizePrintIds(orderProductQueueIds);

      if (!isNetworkPrinter) {
        printActions.addToPrint({
          printType: 'order',
          id: normalizedOrderId,
          device: printerDeviceId,
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
    [attachedPrinter, canPrint, isNetworkPrinter, printActions, printerDeviceId],
  );

  return {
    attachedPrinter,
    canPrint,
    isNetworkPrinter,
    printToAttachedPrinter,
  };
};
