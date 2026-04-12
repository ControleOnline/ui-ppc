import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/food99OrderSummary';

const normalizeText = value => String(value ?? '').trim();

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isPrivacyPlaceholder = value => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  return ['privacy protection', 'privacy_protection', 'privacy-protection'].includes(
    normalized,
  );
};

const sanitizeIdentityValue = value => {
  const normalized = normalizeText(value);
  return normalized && !isPrivacyPlaceholder(normalized) ? normalized : '';
};

const parseJsonObject = value => {
  if (isObject(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return parseJsonObject(parsed);
    }

    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getExtraDataList = order => {
  if (Array.isArray(order?.extraData)) {
    return order.extraData;
  }

  if (Array.isArray(order?.extra_data)) {
    return order.extra_data;
  }

  return [];
};

const getExtraDataMap = order =>
  getExtraDataList(order).reduce((currentMap, extraData) => {
    const context = normalizeKey(
      extraData?.extra_fields?.context || extraData?.extraFields?.context,
    );
    const name = normalizeText(
      extraData?.extra_fields?.name || extraData?.extraFields?.name,
    );
    const value = normalizeText(extraData?.value);

    if (!context || !name || !value) {
      return currentMap;
    }

    if (!currentMap[context]) {
      currentMap[context] = {};
    }

    currentMap[context][name] = value;
    return currentMap;
  }, {});

const decodeOrderOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  );

const getContextFromOtherInformations = (order, context) => {
  const otherInformations = decodeOrderOtherInformations(order);
  const matchedKey = Object.keys(otherInformations).find(
    key => normalizeKey(key) === normalizeKey(context),
  );

  if (!matchedKey) {
    return {};
  }

  const matchedValue = otherInformations?.[matchedKey];
  return isObject(matchedValue) ? matchedValue : parseJsonObject(matchedValue);
};

const getMarketplaceField = (order, contexts, fieldName) => {
  const extraDataMap = getExtraDataMap(order);

  for (const context of contexts) {
    const value = normalizeText(extraDataMap?.[normalizeKey(context)]?.[fieldName]);
    if (value) {
      return value;
    }
  }

  for (const context of contexts) {
    const value = normalizeText(
      getContextFromOtherInformations(order, context)?.[fieldName],
    );
    if (value) {
      return value;
    }
  }

  return '';
};

const resolveMarketplaceAppLabel = order => {
  const app = normalizeText(order?.app).toLowerCase();

  if (app === 'ifood') {
    return 'IFOOD';
  }

  if (['99', '99food', '99 food', 'food99'].includes(app)) {
    return '99';
  }

  return normalizeText(order?.app).toUpperCase();
};

const resolveMarketplaceOrderCode = (order, remoteOrderSummary = null) => {
  const app = normalizeText(order?.app).toLowerCase();
  const fallbackCode = normalizeText(remoteOrderSummary?.identifiers?.orderIndex);

  if (app === 'ifood') {
    return normalizeText(
      getMarketplaceField(order, ['ifood'], 'code') ||
        getMarketplaceField(order, ['ifood'], 'id') ||
        fallbackCode,
    );
  }

  if (['99', '99food', '99 food', 'food99'].includes(app)) {
    return normalizeText(
      getMarketplaceField(order, ['99', '99food', 'food99'], 'code') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'id') ||
        fallbackCode,
    );
  }

  return '';
};

const resolveClientName = (order, remoteOrderSummary = null) =>
  sanitizeIdentityValue(order?.client?.name) ||
  sanitizeIdentityValue(order?.client?.alias) ||
  sanitizeIdentityValue(order?.person?.name) ||
  sanitizeIdentityValue(order?.person?.alias) ||
  sanitizeIdentityValue(order?.customer?.name) ||
  sanitizeIdentityValue(remoteOrderSummary?.customer?.name) ||
  sanitizeIdentityValue(order?.customerName);

export const resolveDisplayTicketSummary = order => {
  const remoteOrderSummary = buildFood99OrderSummary(order) || null;

  return {
    internalOrderCode: normalizeText(order?.id),
    marketplaceLabel: resolveMarketplaceAppLabel(order),
    marketplaceOrderCode: resolveMarketplaceOrderCode(order, remoteOrderSummary),
    clientName: resolveClientName(order, remoteOrderSummary),
  };
};

export const resolveOrderProductDescription = orderProduct => {
  const productName = normalizeKey(orderProduct?.product?.product);
  const description = normalizeText(orderProduct?.product?.description);

  if (!description || normalizeKey(description) === productName) {
    return '';
  }

  return description;
};

export const resolveOrderProductComment = orderProduct =>
  normalizeText(orderProduct?.comment);
