import React, { useEffect, useRef, useState } from 'react'
import { api } from '@controleonline/ui-common/src/api'

import { extractOperationalInsightPayload } from './operationalInsights.utils'
import {
  OperationalInsightsAbcCard,
  OperationalInsightsKpiCard,
  OperationalInsightsRankingCard,
  OperationalInsightsStatusCard,
  OperationalInsightsTrendCard,
} from './OperationalInsightsCards'

const isRenderablePayload = (slide, payload) => {
  if (!slide) {
    return false
  }

  switch (slide.type) {
    case 'kpi':
      return null !== payload && undefined !== payload
    case 'ranking':
    case 'trend':
      return Array.isArray(payload) && payload.length > 0
    case 'abc':
      return Array.isArray(payload?.items) && payload.items.length > 0
    default:
      return false
  }
}

const useOperationalInsightData = ({ insightKey, filters, enabled }) => {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    if (!enabled || !insightKey) {
      requestGenerationRef.current += 1
      setPayload(null)
      setIsLoading(false)
      setError('')
      return undefined
    }

    const requestGeneration = ++requestGenerationRef.current
    let cancelled = false

    setIsLoading(true)
    setError('')
    setPayload(null)

    api.fetch('/report/orders/operational-insights', {
      params: {
        ...(filters || {}),
        insight: insightKey,
      },
    })
      .then(response => {
        if (cancelled || requestGeneration !== requestGenerationRef.current) {
          return
        }

        setPayload(extractOperationalInsightPayload(response, insightKey))
      })
      .catch(() => {
        if (cancelled || requestGeneration !== requestGenerationRef.current) {
          return
        }

        setError(global.t?.t('display', 'message', 'unableLoadOperationalCard'))
      })
      .finally(() => {
        if (!cancelled && requestGeneration === requestGenerationRef.current) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, filters, insightKey])

  return {
    payload,
    isLoading,
    error,
  }
}

const renderCard = ({ slide, ppcColors, payload, isLoading, error }) => {
  if (!slide) {
    return (
      <OperationalInsightsStatusCard
        ppcColors={ppcColors}
        title={global.t?.t('display', 'title', 'operationalInsights')}
        subtitle={global.t?.t('display', 'subtitle', 'noData')}
        message={global.t?.t('display', 'message', 'unableBuildOperationalCards')}
      />
    )
  }

  if (isLoading && !isRenderablePayload(slide, payload)) {
    return (
      <OperationalInsightsStatusCard
        ppcColors={ppcColors}
        title={slide.title}
        subtitle={slide.subtitle}
        loading
        message={global.t?.t('display', 'message', 'loadingCurrentCardData')}
        accentColor={slide.accentColor}
      />
    )
  }

  if (error && !isRenderablePayload(slide, payload)) {
    return (
      <OperationalInsightsStatusCard
        ppcColors={ppcColors}
        title={slide.title}
        subtitle={slide.subtitle}
        message={error}
        accentColor={slide.accentColor}
      />
    )
  }

  if (!isRenderablePayload(slide, payload)) {
    return (
      <OperationalInsightsStatusCard
        ppcColors={ppcColors}
        title={slide.title}
        subtitle={slide.subtitle}
        message={global.t?.t('display', 'message', 'noDataForSelectedPeriod')}
        accentColor={slide.accentColor}
      />
    )
  }

  switch (slide.type) {
    case 'kpi':
      return (
        <OperationalInsightsKpiCard
          ppcColors={ppcColors}
          title={slide.title}
          subtitle={slide.subtitle}
          summary={payload}
          iconName={slide.iconName}
        />
      )
    case 'ranking':
      return (
        <OperationalInsightsRankingCard
          ppcColors={ppcColors}
          title={slide.title}
          subtitle={slide.subtitle}
          accentColor={slide.accentColor}
          items={payload}
          valueKey={slide.valueKey}
          valueLabel={slide.valueLabel}
          secondaryKey={slide.secondaryKey}
          secondaryLabel={slide.secondaryLabel}
          limit={slide.limit || 5}
          iconName={slide.iconName || 'chart-bar'}
        />
      )
    case 'trend':
      return (
        <OperationalInsightsTrendCard
          ppcColors={ppcColors}
          title={slide.title}
          subtitle={slide.subtitle}
          accentColor={slide.accentColor}
          items={payload}
          valueKey={slide.valueKey}
          limit={slide.limit || 10}
          iconName={slide.iconName || 'chart-line'}
        />
      )
    case 'abc':
      return (
        <OperationalInsightsAbcCard
          ppcColors={ppcColors}
          title={slide.title}
          subtitle={slide.subtitle}
          accentColor={slide.accentColor}
          items={payload?.items}
          buckets={payload?.buckets}
          totalUnits={payload?.totalUnits}
          limit={slide.limit || 5}
          iconName={slide.iconName || 'chart-areaspline'}
        />
      )
    default:
      return (
        <OperationalInsightsStatusCard
          ppcColors={ppcColors}
          title={slide.title || global.t?.t('display', 'title', 'operationalInsights')}
          subtitle={slide.subtitle || global.t?.t('display', 'subtitle', 'noData')}
          message={global.t?.t('display', 'message', 'unrecognizedCardFormat')}
          accentColor={slide.accentColor}
        />
      )
  }
}

const OperationalInsightsSlide = ({
  slide = null,
  filters = {},
  ppcColors = {},
  enabled = true,
}) => {
  const { payload, isLoading, error } = useOperationalInsightData({
    insightKey: slide?.insightKey,
    filters,
    enabled,
  })

  return renderCard({
    slide,
    ppcColors,
    payload,
    isLoading,
    error,
  })
}

export default OperationalInsightsSlide
