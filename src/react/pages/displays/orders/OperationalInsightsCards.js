import React, { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { withOpacity } from '@controleonline/../../src/styles/branding'

const normalizeText = value => String(value || '').trim()

const normalizeNumber = value => {
  const numericValue = Number(value || 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const formatNumber = value =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(
    Math.round(normalizeNumber(value)),
  )

const formatPercent = value => `${Math.round(normalizeNumber(value) * 10) / 10}%`

const bucketColors = {
  A: '#16A34A',
  B: '#F59E0B',
  C: '#EF4444',
}

const createStyles = (ppcColors, accentColor) => {
  const accent = accentColor || ppcColors?.accentInfo || '#0EA5E9'

  return StyleSheet.create({
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.borderSoft || '#CBD5E1', 0.92),
      backgroundColor: withOpacity(ppcColors?.cardBg || '#FFFFFF', 0.98),
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: '#0F172A',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    headerIdentity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
      gap: 10,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: withOpacity(accent, 0.1),
      borderColor: withOpacity(accent, 0.28),
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 2,
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '700',
    },
    body: {
      marginTop: 10,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kpiTile: {
      flexGrow: 1,
      flexBasis: '48%',
      minHeight: 64,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: withOpacity(accent, 0.18),
      backgroundColor: withOpacity(accent, 0.06),
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    kpiValue: {
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '900',
    },
    kpiLabel: {
      marginTop: 2,
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    kpiPills: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    kpiPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.82),
      backgroundColor: ppcColors?.panelBg || '#F8FAFC',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    kpiPillText: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    rankingList: {
      gap: 8,
    },
    rankingRow: {
      gap: 5,
    },
    rankingHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    rankingLabelWrap: {
      flex: 1,
      minWidth: 0,
    },
    rankingLabel: {
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '900',
    },
    rankingMeta: {
      marginTop: 1,
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rankingValue: {
      color: accent,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '900',
      textAlign: 'right',
    },
    rankingTrack: {
      height: 7,
      borderRadius: 999,
      backgroundColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.45),
      overflow: 'hidden',
    },
    rankingFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: accent,
    },
    rankingEmpty: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '700',
      fontStyle: 'italic',
    },
    rankingFooter: {
      marginTop: 6,
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    trendList: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
      minHeight: 150,
    },
    trendItem: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    trendValue: {
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '900',
    },
    trendBarTrack: {
      width: '100%',
      flex: 1,
      minHeight: 88,
      borderRadius: 999,
      backgroundColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.38),
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    trendBar: {
      width: '100%',
      borderRadius: 999,
      backgroundColor: accent,
      minHeight: 8,
    },
    trendLabel: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    abcSummaryRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 8,
    },
    abcBucketTile: {
      flex: 1,
      minWidth: 0,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.75),
      backgroundColor: ppcColors?.panelBg || '#F8FAFC',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    abcBucketLabel: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    abcBucketValue: {
      marginTop: 4,
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '900',
    },
    abcBucketMeta: {
      marginTop: 1,
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    },
    abcList: {
      gap: 6,
    },
    abcRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.75),
      backgroundColor: withOpacity(ppcColors?.panelBg || '#F8FAFC', 0.82),
    },
    abcBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    abcBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
    },
    abcItemLabel: {
      flex: 1,
      minWidth: 0,
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },
    abcItemValue: {
      color: accent,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
    },
    statusWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 132,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.75),
      backgroundColor: ppcColors?.panelBg || '#F8FAFC',
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    statusTitle: {
      color: ppcColors?.textPrimary || '#0F172A',
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '900',
      textAlign: 'center',
    },
    statusMessage: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
  })
}

const CardShell = ({
  ppcColors,
  accentColor,
  iconName,
  title,
  subtitle,
  children,
}) => {
  const styles = useMemo(() => createStyles(ppcColors, accentColor), [accentColor, ppcColors])

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={iconName || 'chart-box-outline'}
              size={16}
              color={accentColor || ppcColors?.accentInfo || '#0EA5E9'}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  )
}

const resolveVisibleItems = (items, limit = 5) => {
  const sourceItems = Array.isArray(items)
    ? items
    : Array.isArray(items?.items)
      ? items.items
      : []

  return sourceItems.slice(0, Math.max(1, limit))
}

export const OperationalInsightsKpiCard = ({
  ppcColors,
  title,
  subtitle,
  summary,
  iconName = 'chart-box-outline',
}) => {
  const styles = useMemo(() => createStyles(ppcColors, ppcColors?.accentInfo), [ppcColors])

  const orders = summary?.orders ?? summary?.totals?.orders ?? 0
  const units = summary?.units ?? summary?.totals?.units ?? 0
  const tiles = [
    { label: global.t?.t('display', 'label', 'orders'), value: orders },
    { label: global.t?.t('display', 'label', 'products'), value: units },
  ]

  return (
    <CardShell
      ppcColors={ppcColors}
      accentColor={ppcColors?.accentInfo}
      iconName={iconName}
      title={title}
      subtitle={subtitle}
    >
      <View style={styles.kpiGrid}>
        {tiles.map(tile => (
          <View key={tile.label} style={styles.kpiTile}>
            <Text numberOfLines={1} style={styles.kpiValue}>{formatNumber(tile.value)}</Text>
            <Text numberOfLines={1} style={styles.kpiLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.kpiPills}>
        <View style={styles.kpiPill}>
          <Text style={styles.kpiPillText}>
            {formatNumber(orders)} {global.t?.t('display', 'label', 'orders')}
          </Text>
        </View>
        <View style={styles.kpiPill}>
          <Text style={styles.kpiPillText}>
            {formatNumber(units)} {global.t?.t('display', 'label', 'products')}
          </Text>
        </View>
      </View>
    </CardShell>
  )
}

export const OperationalInsightsRankingCard = ({
  ppcColors,
  title,
  subtitle,
  accentColor,
  items,
  valueKey = 'units',
  valueLabel = global.t?.t('display', 'label', 'units'),
  secondaryKey = 'orders',
  secondaryLabel = global.t?.t('display', 'label', 'orders'),
  limit = 5,
  iconName = 'chart-bar',
}) => {
  const styles = useMemo(() => createStyles(ppcColors, accentColor), [accentColor, ppcColors])
  const visibleItems = resolveVisibleItems(items, limit)
  const sourceItems = Array.isArray(items)
    ? items
    : Array.isArray(items?.items)
      ? items.items
      : []
  const maxValue = visibleItems.reduce(
    (max, item) => Math.max(max, normalizeNumber(item?.[valueKey])),
    0,
  ) || 1

  return (
    <CardShell
      ppcColors={ppcColors}
      accentColor={accentColor}
      iconName={iconName}
      title={title}
      subtitle={subtitle}
    >
      {visibleItems.length > 0 ? (
        <View style={styles.rankingList}>
          {visibleItems.map(item => {
            const value = normalizeNumber(item?.[valueKey])
            const secondaryValue = normalizeNumber(item?.[secondaryKey])
            const widthPercent = Math.max(8, Math.round((value / maxValue) * 100))

            return (
              <View key={item?.key || item?.label} style={styles.rankingRow}>
                <View style={styles.rankingHeaderRow}>
                  <View style={styles.rankingLabelWrap}>
                    <Text numberOfLines={1} style={styles.rankingLabel}>{normalizeText(item?.label || item?.name)}</Text>
                    <Text numberOfLines={1} style={styles.rankingMeta}>
                      {formatNumber(secondaryValue)} {secondaryLabel}
                    </Text>
                  </View>
                  <Text style={styles.rankingValue}>
                    {formatNumber(value)} {valueLabel}
                  </Text>
                </View>
                <View style={styles.rankingTrack}>
                  <View style={[styles.rankingFill, { width: `${widthPercent}%` }]} />
                </View>
              </View>
            )
          })}

          {sourceItems.length > visibleItems.length ? (
            <Text style={styles.rankingFooter}>
              +{sourceItems.length - visibleItems.length} {global.t?.t('display', 'label', 'additionalItems')}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.rankingEmpty}>{global.t?.t('display', 'message', 'noDataForSelectedPeriod')}</Text>
      )}
    </CardShell>
  )
}

export const OperationalInsightsTrendCard = ({
  ppcColors,
  title,
  subtitle,
  accentColor,
  items,
  valueKey = 'units',
  limit = 10,
  iconName = 'chart-line',
}) => {
  const styles = useMemo(() => createStyles(ppcColors, accentColor), [accentColor, ppcColors])
  const visibleItems = resolveVisibleItems(items, limit)
  const maxValue = visibleItems.reduce(
    (max, item) => Math.max(max, normalizeNumber(item?.[valueKey])),
    0,
  ) || 1

  return (
    <CardShell
      ppcColors={ppcColors}
      accentColor={accentColor}
      iconName={iconName}
      title={title}
      subtitle={subtitle}
    >
      {visibleItems.length > 0 ? (
        <View style={styles.trendList}>
          {visibleItems.map(item => {
            const value = normalizeNumber(item?.[valueKey])
            const heightPercent = Math.max(12, Math.round((value / maxValue) * 100))

            return (
              <View key={item?.date || item?.label} style={styles.trendItem}>
                <Text numberOfLines={1} style={styles.trendValue}>{formatNumber(value)}</Text>
                <View style={styles.trendBarTrack}>
                  <View style={[styles.trendBar, { height: `${heightPercent}%` }]} />
                </View>
                <Text numberOfLines={1} style={styles.trendLabel}>{normalizeText(item?.label || item?.date)}</Text>
              </View>
            )
          })}
        </View>
      ) : (
        <Text style={styles.rankingEmpty}>{global.t?.t('display', 'message', 'noHistoricalSeriesForSelectedPeriod')}</Text>
      )}
    </CardShell>
  )
}

export const OperationalInsightsAbcCard = ({
  ppcColors,
  title,
  subtitle,
  accentColor,
  items,
  buckets = [],
  totalUnits = 0,
  limit = 5,
  iconName = 'alpha-a-box',
}) => {
  const styles = useMemo(() => createStyles(ppcColors, accentColor), [accentColor, ppcColors])
  const visibleItems = resolveVisibleItems(items, limit)

  return (
    <CardShell
      ppcColors={ppcColors}
      accentColor={accentColor}
      iconName={iconName}
      title={title}
      subtitle={subtitle}
    >
      <View style={styles.abcSummaryRow}>
        {['A', 'B', 'C'].map(bucket => {
          const bucketData = (Array.isArray(buckets) ? buckets : []).find(item => item?.bucket === bucket) || {}
          const color = bucketColors[bucket]

          return (
            <View key={bucket} style={styles.abcBucketTile}>
              <Text style={styles.abcBucketLabel}>{bucket}</Text>
              <Text style={[styles.abcBucketValue, { color }]}>{formatPercent(bucketData.share || 0)}</Text>
              <Text style={styles.abcBucketMeta}>
                {formatNumber(bucketData.units || 0)} {global.t?.t('display', 'label', 'unitsAbbreviation')}
                {' '}
                {formatNumber(bucketData.items || 0)} {global.t?.t('display', 'label', 'items')}
              </Text>
            </View>
          )
        })}
      </View>

      <View style={styles.abcList}>
        {visibleItems.length > 0 ? visibleItems.map(item => {
          const bucket = normalizeText(item?.bucket).toUpperCase() || 'C'
          const color = bucketColors[bucket] || accentColor

          return (
            <View key={item?.key || item?.label} style={styles.abcRow}>
              <View style={[styles.abcBadge, { backgroundColor: color }]}>
                <Text style={styles.abcBadgeText}>{bucket}</Text>
              </View>
              <Text numberOfLines={1} style={styles.abcItemLabel}>{normalizeText(item?.label || item?.name)}</Text>
              <Text style={styles.abcItemValue}>{formatNumber(item?.units || 0)}</Text>
            </View>
          )
        }) : (
          <Text style={styles.rankingEmpty}>{global.t?.t('display', 'message', 'noItemsForAbcCurve')}</Text>
        )}
      </View>

      <Text style={styles.rankingFooter}>
        {global.t?.t('display', 'label', 'total')}: {formatNumber(totalUnits)} {global.t?.t('display', 'label', 'units')}
      </Text>
    </CardShell>
  )
}

export const OperationalInsightsStatusCard = ({
  ppcColors,
  title,
  subtitle,
  message,
  loading = false,
  accentColor,
}) => {
  const styles = useMemo(() => createStyles(ppcColors, accentColor), [accentColor, ppcColors])

  return (
    <CardShell
      ppcColors={ppcColors}
      accentColor={accentColor}
      iconName="information-outline"
      title={title}
      subtitle={subtitle}
    >
      <View style={styles.statusWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor || ppcColors?.accentInfo || '#0EA5E9'} />
        ) : null}
        <Text style={styles.statusTitle}>
          {loading
            ? global.t?.t('display', 'title', 'loadingIndicators')
            : global.t?.t('display', 'title', 'unavailablePanel')}
        </Text>
        <Text style={styles.statusMessage}>
          {message || (loading
            ? global.t?.t('display', 'message', 'preparingOperationalMetrics')
            : global.t?.t('display', 'message', 'noOperationalDataToDisplay'))}
        </Text>
      </View>
    </CardShell>
  )
}
