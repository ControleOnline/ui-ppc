import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { withOpacity } from '@controleonline/../../src/styles/branding'

import { buildOperationalInsightsSlides } from './operationalInsights.utils'
import OperationalInsightsSlide from './OperationalInsightsSlide'

const ROTATION_MS = 30000

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const createStyles = ppcColors =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 30,
      elevation: 30,
      alignItems: 'flex-end',
    },
    headerPill: {
      alignSelf: 'flex-end',
      marginBottom: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.82),
      backgroundColor: withOpacity(ppcColors?.cardBg || '#FFFFFF', 0.92),
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    headerText: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    cardStage: {
      width: '100%',
    },
    slideCounterPill: {
      alignSelf: 'flex-end',
      marginTop: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(ppcColors?.border || '#CBD5E1', 0.82),
      backgroundColor: withOpacity(ppcColors?.cardBg || '#FFFFFF', 0.92),
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    slideCounterText: {
      color: ppcColors?.textSecondary || '#475569',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
    },
  })

const OperationalInsightsDock = ({
  filters = {},
  ppcColors = {},
  periodLabel = 'Hoje',
}) => {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors])
  const slides = useMemo(
    () => buildOperationalInsightsSlides({ periodLabel }),
    [periodLabel],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const animation = useRef(new Animated.Value(1)).current

  useEffect(() => {
    setActiveIndex(currentIndex => (slides.length > 0 ? currentIndex % slides.length : 0))
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined
    }

    const interval = setInterval(() => {
      setActiveIndex(currentIndex => (currentIndex + 1) % slides.length)
    }, ROTATION_MS)

    return () => clearInterval(interval)
  }, [slides.length])

  useEffect(() => {
    animation.setValue(0)
    Animated.timing(animation, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, animation])

  const dockWidth = clamp(Math.round(width * 0.34), 280, 420)
  const activeSlide = slides[activeIndex] || null
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  })

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          right: insets.right + 12,
          bottom: insets.bottom + 12,
          width: dockWidth,
        },
      ]}
    >
      <View style={styles.headerPill}>
        <Text style={styles.headerText}>Indicadores operacionais</Text>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardStage,
          {
            opacity: animation,
            transform: [{ translateY }],
          },
        ]}
      >
        <OperationalInsightsSlide
          slide={activeSlide}
          filters={filters}
          ppcColors={ppcColors}
          enabled={Boolean(activeSlide) && Boolean(filters && Object.keys(filters).length > 0)}
        />
      </Animated.View>

      {slides.length > 1 ? (
        <View style={styles.slideCounterPill}>
          <Text style={styles.slideCounterText}>
            {activeIndex + 1}/{slides.length}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default OperationalInsightsDock
