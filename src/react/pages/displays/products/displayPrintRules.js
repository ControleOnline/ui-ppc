import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/food99OrderSummary';
import {
  resolveMarketplaceAppLabel,
  resolveMarketplaceOrderCode,
  resolveOrderIdentity,
} from '@controleonline/ui-orders/src/react/utils/orderIdentity';

const normalizeText = value => String(value ?? '').trim();

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

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
  const identity = resolveOrderIdentity(order, remoteOrderSummary);

  return {
    internalOrderCode: identity.internalId,
    marketplaceLabel: identity.externalLabel || resolveMarketplaceAppLabel(order),
    marketplaceOrderCode:
      identity.externalId || resolveMarketplaceOrderCode(order, remoteOrderSummary),
    identity,
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
