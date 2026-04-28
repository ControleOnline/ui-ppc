import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, ScrollView } from 'react-native'

const TOP_HOLD_MS = 1200
const BOTTOM_HOLD_MS = 1200
const MIN_SCROLL_DURATION_MS = 4500
const MAX_SCROLL_DURATION_MS = 16000
const SCROLL_DURATION_FACTOR = 18

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const resolveScrollDuration = overflow =>
  clamp(
    Math.round(Number(overflow || 0) * SCROLL_DURATION_FACTOR),
    MIN_SCROLL_DURATION_MS,
    MAX_SCROLL_DURATION_MS,
  )

const TvAutoScrollView = ({
  enabled = false,
  style = null,
  contentContainerStyle = null,
  children,
}) => {
  const scrollRef = useRef(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const animationRef = useRef(null)
  const listenerIdRef = useRef(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)

  const overflow = Math.max(0, Math.round(contentHeight - viewportHeight))

  useEffect(() => {
    listenerIdRef.current = scrollY.addListener(({ value }) => {
      scrollRef.current?.scrollTo({
        y: value,
        animated: false,
      })
    })

    return () => {
      if (listenerIdRef.current !== null) {
        scrollY.removeListener(listenerIdRef.current)
      }
    }
  }, [scrollY])

  useEffect(() => {
    return () => {
      animationRef.current?.stop?.()
      scrollY.stopAnimation()
    }
  }, [scrollY])

  useEffect(() => {
    animationRef.current?.stop?.()
    scrollY.stopAnimation()
    scrollY.setValue(0)
    scrollRef.current?.scrollTo({ y: 0, animated: false })

    if (!enabled || overflow <= 0) {
      return undefined
    }

    const duration = resolveScrollDuration(overflow)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(TOP_HOLD_MS),
        Animated.timing(scrollY, {
          toValue: overflow,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(BOTTOM_HOLD_MS),
        Animated.timing(scrollY, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    )

    animationRef.current = animation
    animation.start()

    return () => {
      animation.stop()
      animationRef.current = null
      scrollY.stopAnimation()
    }
  }, [enabled, overflow, scrollY])

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      onLayout={event => {
        setViewportHeight(Math.round(event.nativeEvent.layout.height))
      }}
      onContentSizeChange={(_, nextHeight) => {
        setContentHeight(Math.round(nextHeight))
      }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

export default TvAutoScrollView
