import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import createStyles from './DateShortcutFilter.styles';
import {
    resolveDateFilterCurrentLabel,
    resolveDateFilterOptions,
    resolveDateFilterTitle,
    resolveDateRangeSummary,
} from './dateFilterUtils';

const DateShortcutFilter = ({
    value = '',
    onChange = null,
    ppcColorsOverride = null,
}) => {
    const { ppcColors: defaultPpcColors } = useDisplayTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const options = useMemo(() => resolveDateFilterOptions(), []);
    const periodLabel = useMemo(() => resolveDateFilterTitle(), []);
    const currentDateLabel = useMemo(() => resolveDateFilterCurrentLabel(), []);
    const activeRangeSummary = useMemo(
        () => resolveDateRangeSummary(value),
        [value],
    );

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>
                        {periodLabel}
                    </Text>

                    {!!activeRangeSummary && (
                        <View style={styles.currentDateWrap}>
                            <Text style={styles.currentDateLabel}>
                                {currentDateLabel}
                            </Text>
                            <Text style={styles.currentDateValue}>
                                {activeRangeSummary}
                            </Text>
                        </View>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {options.map(option => {
                        const active = option.key === value;

                        return (
                            <TouchableOpacity
                                key={option.key}
                                activeOpacity={0.9}
                                style={[
                                    styles.chip,
                                    active ? styles.chipActive : null,
                                ]}
                                onPress={() => onChange?.(option.key)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        active ? styles.chipTextActive : null,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
};

export default DateShortcutFilter;
