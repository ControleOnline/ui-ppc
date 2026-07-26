export const DISPLAY_TYPE_PRODUCTION = 'production';
export const DISPLAY_TYPE_CONFERENCE = 'conference';
export const DISPLAY_TYPE_TRACKING = 'tracking';

export const DISPLAY_TYPE_OPTIONS = [
  { value: DISPLAY_TYPE_PRODUCTION, label: 'Production' },
  { value: DISPLAY_TYPE_CONFERENCE, label: 'Conference' },
  { value: DISPLAY_TYPE_TRACKING, label: 'Tracking' },
];

const LEGACY_DISPLAY_TYPES = {
  products: DISPLAY_TYPE_PRODUCTION,
  orders: DISPLAY_TYPE_CONFERENCE,
  tv: DISPLAY_TYPE_TRACKING,
};

export const normalizeDisplayType = value => {
  const type = String(value || '').trim().toLowerCase();
  return LEGACY_DISPLAY_TYPES[type] || type || DISPLAY_TYPE_PRODUCTION;
};

export const isProductionDisplayType = value =>
  normalizeDisplayType(value) === DISPLAY_TYPE_PRODUCTION;

export const isConferenceDisplayType = value =>
  normalizeDisplayType(value) === DISPLAY_TYPE_CONFERENCE;

export const isTrackingDisplayType = value =>
  normalizeDisplayType(value) === DISPLAY_TYPE_TRACKING;

export const resolveDisplayTypeLabel = value => {
  const type = normalizeDisplayType(value);
  return DISPLAY_TYPE_OPTIONS.find(option => option.value === type)?.label || type;
};
