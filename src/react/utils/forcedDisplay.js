export const DISPLAY_DEVICE_LINK_CONFIG_KEY = 'display-id';

export const normalizeEntityId = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }

    if (/^\d+$/.test(trimmed)) {
      const normalized = Number(trimmed);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    }

    const iriMatch = trimmed.match(/\/(\d+)(?:\/)?$/);
    if (iriMatch?.[1]) {
      const normalized = Number(iriMatch[1]);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    }

    const digits = trimmed.replace(/\D+/g, '');
    if (digits !== '') {
      const normalized = Number(digits);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    }

    return null;
  }

  if (typeof value === 'object') {
    if (value['@id']) {
      return normalizeEntityId(value['@id']);
    }

    if (Object.prototype.hasOwnProperty.call(value, 'id')) {
      return normalizeEntityId(value.id);
    }
  }

  return null;
};

export const resolveForcedDisplayId = deviceConfig =>
  normalizeEntityId(deviceConfig?.configs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]);

export const doesDisplayBelongToCompany = (display, companyId) => {
  const normalizedCompanyId = normalizeEntityId(companyId);
  const displayCompanyId = normalizeEntityId(
    display?.company?.id || display?.company,
  );

  if (!normalizedCompanyId || !displayCompanyId) {
    return true;
  }

  return normalizedCompanyId === displayCompanyId;
};

export const buildForcedDisplayParams = display => {
  const displayId = normalizeEntityId(display);

  if (!displayId) {
    return null;
  }

  return {
    id: String(displayId),
    displayType: String(display?.displayType || '').trim(),
    forcedDisplay: true,
    hideBottomToolBar: true,
  };
};
