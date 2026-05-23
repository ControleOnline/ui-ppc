const normalizeText = value => String(value || '').trim()

export const extractOperationalInsightsPayload = response => {
  const summary = response?.summary

  if (summary?.operationalInsights) {
    return summary.operationalInsights
  }

  if (summary?.report?.operationalInsights) {
    return summary.report.operationalInsights
  }

  if (summary?.report) {
    return summary.report
  }

  if (summary) {
    return summary
  }

  if (response?.operationalInsights) {
    return response.operationalInsights
  }

  if (response?.report?.operationalInsights) {
    return response.report.operationalInsights
  }

  if (response?.report) {
    return response.report
  }

  return null
}

export const extractOperationalInsightPayload = (response, insightKey) => {
  const payload = extractOperationalInsightsPayload(response)
  const normalizedInsightKey = normalizeText(insightKey)

  if (!payload || '' === normalizedInsightKey) {
    return payload
  }

  if (Array.isArray(payload)) {
    return payload
  }

  if (payload?.[normalizedInsightKey] !== undefined) {
    return payload[normalizedInsightKey]
  }

  if (payload?.operationalInsights?.[normalizedInsightKey] !== undefined) {
    return payload.operationalInsights[normalizedInsightKey]
  }

  if (payload?.report?.operationalInsights?.[normalizedInsightKey] !== undefined) {
    return payload.report.operationalInsights[normalizedInsightKey]
  }

  return payload
}

export const buildOperationalInsightsSlides = ({ periodLabel = 'Hoje' } = {}) => [
  {
    key: 'totals',
    insightKey: 'totals',
    type: 'kpi',
    title: 'Resumo operacional',
    subtitle: periodLabel,
    accentColor: '#0EA5E9',
    iconName: 'chart-box-outline',
  },
  {
    key: 'apps',
    insightKey: 'apps',
    type: 'ranking',
    title: 'Vendas por app',
    subtitle: 'Pedidos e unidades',
    accentColor: '#0EA5E9',
    iconName: 'cellphone-link',
    valueKey: 'units',
    valueLabel: 'unidades',
    secondaryKey: 'orders',
    secondaryLabel: 'pedidos',
    limit: 5,
  },
  {
    key: 'displays',
    insightKey: 'displays',
    type: 'ranking',
    title: 'Lançamentos por display',
    subtitle: 'Fila e unidades',
    accentColor: '#22C55E',
    iconName: 'monitor-dashboard',
    valueKey: 'units',
    valueLabel: 'unidades',
    secondaryKey: 'queueCount',
    secondaryLabel: 'lançamentos',
    limit: 5,
  },
  {
    key: 'products',
    insightKey: 'products',
    type: 'ranking',
    title: 'Produtos mais vendidos',
    subtitle: 'Top itens do período',
    accentColor: '#F59E0B',
    iconName: 'food',
    valueKey: 'units',
    valueLabel: 'unidades',
    secondaryKey: 'orders',
    secondaryLabel: 'pedidos',
    limit: 5,
  },
  {
    key: 'daily',
    insightKey: 'daily',
    type: 'trend',
    title: 'Produtos por dia',
    subtitle: periodLabel,
    accentColor: '#8B5CF6',
    iconName: 'chart-line',
    valueKey: 'units',
    limit: 10,
  },
  {
    key: 'abc',
    insightKey: 'abc',
    type: 'abc',
    title: 'Curva ABC',
    subtitle: 'Participação por item',
    accentColor: '#14B8A6',
    iconName: 'chart-areaspline',
    valueKey: 'units',
    limit: 5,
  },
]
