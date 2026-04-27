import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@store';
import { usePrintButtonController } from '@controleonline/ui-common/src/react/print/usePrintButtonController';
import { normalizeAutoPrintQueueItemId } from './autoPrint';

const getSelectPrinterMessage = () =>
  global.t?.t('orders', 'title', 'selectPrinter') || 'Selecione a impressora.';

const DisplayAutoPrintDispatcher = ({
  display = null,
  displayId = '',
  queueItemIds = [],
  onJobSettled = null,
}) => {
  const peopleStore = useStore('people');
  const printStore = useStore('print');
  const printerStore = useStore('printer');
  const deviceConfigStore = useStore('device_config');

  const { currentCompany } = peopleStore.getters;
  const printActions = printStore.actions;
  const { isLoading: isLoadingPrinters } = printerStore.getters;
  const { isLoading: isLoadingDeviceConfigs } = deviceConfigStore.getters;
  const [dependenciesReady, setDependenciesReady] = useState(false);
  const requestedKeyRef = useRef('');

  const activeQueueItemId = useMemo(
    () =>
      (Array.isArray(queueItemIds) ? queueItemIds : [])
        .map(normalizeAutoPrintQueueItemId)
        .find(Boolean) || '',
    [queueItemIds],
  );

  useEffect(() => {
    let cancelled = false;

    requestedKeyRef.current = '';
    setDependenciesReady(false);

    if (!currentCompany?.id) {
      return () => {
        cancelled = true;
      };
    }

    printActions
      .ensurePrintDependenciesLoaded({
        companyId: currentCompany.id,
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setDependenciesReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentCompany?.id, printActions]);

  const handleJobSettled = useCallback(
    result => {
      onJobSettled?.(activeQueueItemId, result);
    },
    [activeQueueItemId, onJobSettled],
  );

  const {
    handlePrint,
    normalizedJob,
    requestKey,
    selectedPrinter,
    setError,
  } = usePrintButtonController({
    job: activeQueueItemId
      ? {
          type: 'order-product-queue',
          orderProductQueueId: activeQueueItemId,
        }
      : null,
    store: 'order_products_queue',
    printerSelection: {
      enabled: true,
      context: 'display',
      display,
      displayId,
    },
    onSuccess: handleJobSettled,
    onError: handleJobSettled,
  });

  const dependenciesLoading = Boolean(
    isLoadingPrinters || isLoadingDeviceConfigs,
  );

  useEffect(() => {
    if (!activeQueueItemId) {
      requestedKeyRef.current = '';
      return;
    }

    if (
      !dependenciesReady ||
      dependenciesLoading ||
      !normalizedJob ||
      !requestKey
    ) {
      return;
    }

    if (requestedKeyRef.current === requestKey) {
      return;
    }

    if (!selectedPrinter?.device) {
      const errorMessage = getSelectPrinterMessage();
      requestedKeyRef.current = requestKey;
      setError(errorMessage);
      handleJobSettled({
        requestKey,
        status: 'error',
        completedAt: Date.now(),
        error: errorMessage,
      });
      return;
    }

    requestedKeyRef.current = requestKey;
    handlePrint();
  }, [
    activeQueueItemId,
    dependenciesLoading,
    dependenciesReady,
    handleJobSettled,
    handlePrint,
    normalizedJob,
    requestKey,
    selectedPrinter?.device,
    setError,
  ]);

  return null;
};

export default DisplayAutoPrintDispatcher;
