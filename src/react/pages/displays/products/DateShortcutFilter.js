import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import createStyles from './DateShortcutFilter.styles';
import {
    validateCustomDateRange,
    resolveDateFilterCurrentLabel,
    resolveDateFilterOptions,
    resolveDateFilterTitle,
    resolveDateRangeSummary,
} from './dateFilterUtils';

const DateShortcutFilter = ({
    value = '',
    onChange = null,
    customRange = null,
    onCustomRangeChange = null,
    ppcColorsOverride = null,
}) => {
    const { ppcColors: defaultPpcColors } = useDisplayTheme();
    const ppcColors = ppcColorsOverride || defaultPpcColors;
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
    const [customFromInput, setCustomFromInput] = useState('');
    const [customToInput, setCustomToInput] = useState('');
    const [dateValidationMessage, setDateValidationMessage] = useState('');
    const options = resolveDateFilterOptions();
    const periodLabel = resolveDateFilterTitle();
    const currentDateLabel = resolveDateFilterCurrentLabel();
    const activeRangeSummary = useMemo(
        () => resolveDateRangeSummary(value, customRange),
        [customRange, value],
    );

    useEffect(() => {
        setCustomFromInput(String(customRange?.from || ''));
        setCustomToInput(String(customRange?.to || ''));
    }, [customRange?.from, customRange?.to]);

    useEffect(() => {
        if (value !== 'custom') {
            setDateValidationMessage('');
        }
    }, [value]);

    const applyCustomRange = useCallback(() => {
        const validationMessage = validateCustomDateRange(
            customFromInput,
            customToInput,
        );

        setDateValidationMessage(validationMessage);

        if (validationMessage) {
            return;
        }

        onCustomRangeChange?.({
            from: String(customFromInput || '').trim(),
            to: String(customToInput || '').trim(),
        });
    }, [customFromInput, customToInput, onCustomRangeChange]);

    const clearCustomRange = useCallback(() => {
        setCustomFromInput('');
        setCustomToInput('');
        setDateValidationMessage('');
        onCustomRangeChange?.({
            from: '',
            to: '',
        });
    }, [onCustomRangeChange]);

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

                {value === 'custom' && (
                    <View style={styles.customRangeWrap}>
                        <View style={styles.customInputsRow}>
                            <TextInput
                                value={customFromInput}
                                onChangeText={setCustomFromInput}
                                placeholder={global.t?.t('orders', 'placeholder', 'date_from')}
                                placeholderTextColor={ppcColors.textSecondary}
                                style={styles.customInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <TextInput
                                value={customToInput}
                                onChangeText={setCustomToInput}
                                placeholder={global.t?.t('orders', 'placeholder', 'date_to')}
                                placeholderTextColor={ppcColors.textSecondary}
                                style={styles.customInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {!!dateValidationMessage && (
                            <Text style={styles.validationText}>
                                {dateValidationMessage}
                            </Text>
                        )}

                        <View style={styles.customActionsRow}>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                activeOpacity={0.9}
                                onPress={clearCustomRange}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {global.t?.t('orders', 'button', 'clear')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                activeOpacity={0.9}
                                onPress={applyCustomRange}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {global.t?.t('orders', 'button', 'apply_period')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

export default DateShortcutFilter;
