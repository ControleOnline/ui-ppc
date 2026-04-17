import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import createStyles from './AppearanceToggle.styles';

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
