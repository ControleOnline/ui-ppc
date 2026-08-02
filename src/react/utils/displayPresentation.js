export const QUEUE_IDENTIFICATION_OPTIONS = [
  { value: 'none', label: 'Não exibir' },
  { value: 'name', label: 'Nome da fila' },
  { value: 'short_label', label: 'Identificação curta' },
  { value: 'icon', label: 'Ícone' },
]

export const STATUS_INDICATOR_OPTIONS = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'line', label: 'Linha curva' },
]

export const normalizeQueueIdentificationMode = value =>
  QUEUE_IDENTIFICATION_OPTIONS.some(option => option.value === value)
    ? value
    : 'short_label'

export const normalizeStatusIndicatorMode = value =>
  value === 'line' ? 'line' : 'bullet'

export const resolveDisplayPresentation = display => ({
  queueIdentificationMode: normalizeQueueIdentificationMode(
    display?.queueIdentificationMode,
  ),
  statusIndicatorMode: normalizeStatusIndicatorMode(
    display?.statusIndicatorMode,
  ),
  showUnitQuantity: display?.showUnitQuantity === true,
  showGroupNames: display?.showGroupNames === true,
})
