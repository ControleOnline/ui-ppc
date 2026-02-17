import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { getOrderChannelLabel, getOrderChannelLogo } from '@assets/ppc/channels'

const BRAND_LOGO = require('@assets/ppc/logo 512x512 r.png')

const normalizeText = value => String(value || '').trim()

const extractExtraEntries = extraData => {
  if (!extraData) return []

  if (Array.isArray(extraData)) {
    return extraData
      .map((item, index) => ({
        id: item?.id || `extra-${index}`,
        context:
          item?.extra_fields?.context ||
          item?.extraField?.context ||
          item?.label ||
          item?.key ||
          'Info',
        value: item?.value || item?.content || '',
      }))
      .filter(item => item.value)
  }

  if (typeof extraData === 'object') {
    return Object.entries(extraData)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([context, value], index) => ({
        id: `extra-object-${index}`,
        context,
        value,
      }))
  }

  return []
}

const isChannelEntry = context =>
  /ifood|food99|99|instagram|insta|keeta|whats|messenger|facebook/i.test(String(context || ''))

const getExternalOrderRef = order => {
  const entries = extractExtraEntries(order?.extraData)
  const preferred = entries.find(item => isChannelEntry(item.context))
  const first = entries[0]
  const fallback = normalizeText(
    order?.externalCode || order?.externalId || order?.reference || order?.code,
  )

  return normalizeText(preferred?.value || first?.value || fallback)
}

const getCustomerName = order =>
  normalizeText(
    order?.client?.name ||
      order?.person?.name ||
      order?.person?.person ||
      order?.customer?.name ||
      order?.customerName ||
      order?.name,
  )

const getCustomerContact = order => {
  const email = Array.isArray(order?.client?.email)
    ? order?.client?.email?.[0]?.email
    : order?.client?.email

  const phoneSource = Array.isArray(order?.client?.phone)
    ? order?.client?.phone?.[0]
    : order?.client?.phone

  if (phoneSource && typeof phoneSource === 'object' && phoneSource.phone) {
    return normalizeText(`+${phoneSource.ddi || ''} (${phoneSource.ddd || ''}) ${phoneSource.phone}`)
  }

  return normalizeText(email || phoneSource || order?.person?.phone || order?.person?.email)
}

const KDSOrderHeader = ({ order, compact = false, showCustomer = false }) => {
  const channelLogo = getOrderChannelLogo(order)
  const channelLabel = getOrderChannelLabel(order)
  const statusColor = order?.status?.color || '#6B7280'
  const externalOrderRef = getExternalOrderRef(order)
  const customerName = getCustomerName(order)
  const customerContact = getCustomerContact(order)

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Image source={BRAND_LOGO} style={styles.brandLogo} resizeMode="contain" />
          <View>
            <Text style={styles.orderId}>Pedido #{order?.id}</Text>
            <Text style={styles.orderTime}>
              {Formatter.formatDateYmdTodmY(order?.orderDate, true)}
            </Text>
          </View>
        </View>

        <View style={styles.rightInfo}>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{order?.status?.status || 'Status'}</Text>
          </View>
          <Text style={styles.orderPrice}>{Formatter.formatMoney(order?.price)}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.channelWrap}>
          {channelLogo ? (
            <Image source={channelLogo} style={styles.channelLogo} resizeMode="contain" />
          ) : (
            <View style={styles.channelFallback}>
              <Text style={styles.channelFallbackText}>{channelLabel[0] || 'B'}</Text>
            </View>
          )}
          <Text style={styles.channelText}>{externalOrderRef || channelLabel}</Text>
        </View>
      </View>

      {showCustomer && !!customerName && (
        <Text numberOfLines={1} style={styles.customerNameText}>
          {customerName}
        </Text>
      )}
      {showCustomer && !!customerContact && (
        <Text numberOfLines={1} style={styles.customerContactText}>
          {customerContact}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A313D',
    backgroundColor: '#111821',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  wrapCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  orderId: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '800',
  },
  orderTime: {
    color: '#98A2B3',
    fontSize: 13,
    marginTop: 2,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#0C1219',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  statusText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderPrice: {
    color: '#FACC15',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  bottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '52%',
  },
  channelLogo: {
    width: 22,
    height: 22,
    marginRight: 8,
    borderRadius: 4,
  },
  channelFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelFallbackText: {
    color: '#0B1016',
    fontSize: 12,
    fontWeight: '800',
  },
  channelText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
  },
  customerNameText: {
    marginTop: 6,
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
  },
  customerContactText: {
    marginTop: 2,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
})

export default KDSOrderHeader
