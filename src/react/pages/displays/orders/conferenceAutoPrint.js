const CONFERENCE_PRINT_OTHER_INFORMATION_KEY = 'conference_print'
const ORDER_CREATED_EVENT = 'order.created'

const normalizeText = value => String(value || '').trim()
const isTruthyFlag = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  normalizeText(value).toLowerCase() === 'true'

export const normalizeConferenceAutoPrintOrderId = value =>
  String(value?.id || value?.['@id'] || value || '')
    .replace(/\D+/g, '')
    .trim()

const normalizeConferenceAutoPrintEntityRef = value =>
  normalizeConferenceAutoPrintOrderId(value) ||
  normalizeText(value?.id || value?.['@id'] || value)

const parseJsonObject = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

export const decodeOrderOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  )

export const getConferencePrintState = order => {
  const otherInformations = decodeOrderOtherInformations(order)
  const state = otherInformations?.[CONFERENCE_PRINT_OTHER_INFORMATION_KEY]

  return state && typeof state === 'object' && !Array.isArray(state) ? state : {}
}

export const isConferenceOrderPrinted = order => {
  const state = getConferencePrintState(order)

  return Boolean(
    state?.printed === true ||
      state?.printed === '1' ||
      normalizeText(state?.printed_at) !== '',
  )
}

export const isRelevantConferenceAutoPrintMessage = message => {
  const store = normalizeText(message?.store)
  const event = normalizeText(message?.event)
  const realStatus = normalizeText(message?.realStatus).toLowerCase()
  const orderId = normalizeConferenceAutoPrintOrderId(message?.order)

  return (
    store === 'orders' &&
    event === ORDER_CREATED_EVENT &&
    realStatus === 'open' &&
    orderId !== '' &&
    isTruthyFlag(message?.alertSound)
  )
}

export const buildConferenceAutoPrintMessageFingerprint = message =>
  JSON.stringify({
    store: normalizeText(message?.store),
    event: normalizeText(message?.event),
    company: normalizeConferenceAutoPrintEntityRef(
      message?.company?.id || message?.companyId || message?.company,
    ),
    order: normalizeConferenceAutoPrintOrderId(message?.order),
    sentAt: normalizeText(message?.sentAt),
    alertSound: isTruthyFlag(message?.alertSound),
  })

export const appendPendingConferenceAutoPrintJob = (jobs = [], orderId = null) => {
  const nextOrderId = normalizeConferenceAutoPrintOrderId(orderId)
  const currentJobs = (Array.isArray(jobs) ? jobs : [])
    .map(normalizeConferenceAutoPrintOrderId)
    .filter(Boolean)

  if (!nextOrderId || currentJobs.includes(nextOrderId)) {
    return currentJobs
  }

  return [...currentJobs, nextOrderId]
}

export const removePendingConferenceAutoPrintJob = (jobs = [], orderId = null) =>
  (Array.isArray(jobs) ? jobs : [])
    .map(normalizeConferenceAutoPrintOrderId)
    .filter(jobId => jobId && jobId !== normalizeConferenceAutoPrintOrderId(orderId))
