import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@store'
import { usePrintButtonController } from '@controleonline/ui-common/src/react/print/usePrintButtonController'
import { normalizeConferenceAutoPrintOrderId } from './conferenceAutoPrint'

const getSelectPrinterMessage = () =>
  global.t?.t('orders', 'title', 'selectPrinter') || 'Selecione a impressora.'

const DisplayConferenceAutoPrintDispatcher = ({
  display = null,
  displayId = '',
  orderIds = [],
  onJobSettled = null,
}) => {
  const peopleStore = useStore('people')
  const printStore = useStore('print')
  const printerStore = useStore('printer')
  const deviceConfigStore = useStore('device_config')
  const ordersStore = useStore('orders')

  const { currentCompany } = peopleStore.getters
  const printActions = printStore.actions
  const ordersActions = ordersStore.actions
  const { isLoading: isLoadingPrinters } = printerStore.getters
  const { isLoading: isLoadingDeviceConfigs } = deviceConfigStore.getters
  const [dependenciesReady, setDependenciesReady] = useState(false)
  const requestedKeyRef = useRef('')

  const activeOrderId = useMemo(
    () =>
      (Array.isArray(orderIds) ? orderIds : [])
        .map(normalizeConferenceAutoPrintOrderId)
        .find(Boolean) || '',
    [orderIds],
  )

  useEffect(() => {
    let cancelled = false

    requestedKeyRef.current = ''
    setDependenciesReady(false)

    if (!currentCompany?.id) {
      return () => {
        cancelled = true
      }
    }

    printActions
      .ensurePrintDependenciesLoaded({
        companyId: currentCompany.id,
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setDependenciesReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentCompany?.id, printActions])

  const handleJobSettled = useCallback(
    (result = null) => {
      onJobSettled?.(activeOrderId, result)
    },
    [activeOrderId, onJobSettled],
  )

  const {
    currentDeviceType,
    normalizedJob,
    requestKey,
    selectedPrinter,
    setError,
  } = usePrintButtonController({
    job: activeOrderId
      ? {
          type: 'order',
          orderId: activeOrderId,
        }
      : null,
    store: 'orders',
    printerSelection: {
      enabled: true,
      context: 'display',
      display,
      displayId,
    },
  })

  const dependenciesLoading = Boolean(
    isLoadingPrinters || isLoadingDeviceConfigs,
  )

  useEffect(() => {
    if (!activeOrderId) {
      requestedKeyRef.current = ''
      return
    }

    if (
      !dependenciesReady ||
      dependenciesLoading ||
      !normalizedJob ||
      !requestKey
    ) {
      return
    }

    if (requestedKeyRef.current === requestKey) {
      return
    }

    if (!selectedPrinter?.device) {
      const errorMessage = getSelectPrinterMessage()
      requestedKeyRef.current = requestKey
      setError(errorMessage)
      handleJobSettled({
        requestKey,
        status: 'error',
        completedAt: Date.now(),
        error: errorMessage,
      })
      return
    }

    requestedKeyRef.current = requestKey
    ordersActions
      .requestConferenceAutoPrint({
        id: activeOrderId,
        device: selectedPrinter.device,
        type: selectedPrinter.type || currentDeviceType,
        people: currentCompany?.id || null,
        displayId,
        source: 'display-auto',
      })
      .then(result => {
        handleJobSettled({
          requestKey,
          status: 'success',
          completedAt: Date.now(),
          ...result,
        })
      })
      .catch(error => {
        handleJobSettled({
          requestKey,
          status: 'error',
          completedAt: Date.now(),
          error: error?.message || String(error || ''),
        })
      })
  }, [
    activeOrderId,
    currentCompany?.id,
    currentDeviceType,
    dependenciesLoading,
    dependenciesReady,
    displayId,
    handleJobSettled,
    normalizedJob,
    ordersActions,
    requestKey,
    selectedPrinter?.device,
    selectedPrinter?.type,
    setError,
  ])

  return null
}

export default DisplayConferenceAutoPrintDispatcher
