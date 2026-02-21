import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppearanceToggle({ isDark, onToggle, ppcColors, compact = false }) {
  const styles = useMemo(() => createStyles(ppcColors, compact), [ppcColors, compact]);

  return (
    <Pressable style={styles.wrap} onPress={onToggle}>
      <View style={[styles.thumb, isDark ? styles.thumbDark : styles.thumbLight]} />

      <View style={[styles.option, isDark ? styles.optionActive : styles.optionInactive]}>
        <MaterialCommunityIcons
          name="weather-night"
          size={compact ? 12 : 13}
          color={isDark ? ppcColors.textDark : ppcColors.textSecondary}
        />
        <Text style={[styles.label, isDark && styles.labelActive]}>NOITE</Text>
      </View>

      <View style={[styles.option, !isDark ? styles.optionActive : styles.optionInactive]}>
        <MaterialCommunityIcons
          name="white-balance-sunny"
          size={compact ? 12 : 13}
          color={!isDark ? ppcColors.textDark : ppcColors.textSecondary}
        />
        <Text style={[styles.label, !isDark && styles.labelActive]}>DIA</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (ppcColors, compact) =>
  StyleSheet.create({
    wrap: {
      width: compact ? 146 : 164,
      height: compact ? 34 : 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.panelBg,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 3,
      position: 'relative',
      overflow: 'hidden',
    },
    thumb: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      width: compact ? 68 : 78,
      borderRadius: 999,
      backgroundColor: ppcColors.accent,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    thumbDark: {
      left: 3,
    },
    thumbLight: {
      right: 3,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 999,
      zIndex: 2,
    },
    optionActive: {
      opacity: 1,
    },
    optionInactive: {
      opacity: 0.82,
    },
    label: {
      fontSize: compact ? 10 : 11,
      fontWeight: '800',
      color: ppcColors.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: ppcColors.textDark,
    },
  });
