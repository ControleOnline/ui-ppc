export const AUTO_PRINT_SOURCE_STAGE = 'status_in';
export const AUTO_PRINT_TARGET_STAGE = 'status_working';
export const DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY =
  'display-auto-print-product';

const isTruthyValue = value =>
  value === true || value === '1' || value === 1 || value === 'true';

const parseConfigsObject = configs => {
  if (!configs) {
    return {};
  }

  if (typeof configs === 'string') {
    try {
      const parsed = JSON.parse(configs);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof configs === 'object' ? { ...configs } : {};
};

export const normalizeAutoPrintQueueItemId = value => {
  const rawValue =
    value && typeof value === 'object'
      ? value?.id || value?.['@id'] || ''
      : value;

  return String(rawValue || '')
    .replace(/\D+/g, '')
    .trim();
};

export const appendPendingAutoPrintJob = (jobs = [], queueItem = null) => {
  const nextJobId = normalizeAutoPrintQueueItemId(queueItem);
  const currentJobs = (Array.isArray(jobs) ? jobs : [])
    .map(normalizeAutoPrintQueueItemId)
    .filter(Boolean);

  if (!nextJobId || currentJobs.includes(nextJobId)) {
    return currentJobs;
  }

  return [...currentJobs, nextJobId];
};

export const removePendingAutoPrintJob = (jobs = [], queueItem = null) => {
  const targetJobId = normalizeAutoPrintQueueItemId(queueItem);
  return (Array.isArray(jobs) ? jobs : [])
    .map(normalizeAutoPrintQueueItemId)
    .filter(jobId => jobId && jobId !== targetJobId);
};

export const shouldAutoPrintTransition = ({
  autoPrintEnabled = false,
  fromStage = '',
  toStage = '',
} = {}) =>
  Boolean(
    autoPrintEnabled &&
      fromStage === AUTO_PRINT_SOURCE_STAGE &&
      toStage === AUTO_PRINT_TARGET_STAGE,
  );

export const isDisplayAutoPrintEnabled = deviceConfig =>
  isTruthyValue(
    parseConfigsObject(deviceConfig?.configs)?.[
      DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY
    ],
  );
