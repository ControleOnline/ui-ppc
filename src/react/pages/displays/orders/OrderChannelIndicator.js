import React, { useMemo } from 'react'
import { Image, Text, View } from 'react-native'

import {
  getOrderChannelLabel,
  getOrderChannelLogo,
} from '@assets/ppc/channels'

const normalizeLabel = value => String(value || '').trim().toUpperCase()

const OrderChannelIndicator = ({
  order = null,
  iconWrapStyle = null,
  iconStyle = null,
  fallbackWrapStyle = null,
  fallbackTextStyle = null,
}) => {
  const channelLogo = useMemo(() => getOrderChannelLogo(order), [order])
  const channelLabel = useMemo(
    () => normalizeLabel(getOrderChannelLabel(order) || 'Balcao'),
    [order],
  )

  if (channelLogo) {
    return (
      <View style={iconWrapStyle}>
        <Image source={channelLogo} style={iconStyle} resizeMode="contain" />
      </View>
    )
  }

  return (
    <View style={fallbackWrapStyle}>
      <Text numberOfLines={1} style={fallbackTextStyle}>
        {channelLabel}
      </Text>
    </View>
  )
}

export default OrderChannelIndicator
