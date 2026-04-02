import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ProductsDisplay from './products';
import OrdersDisplay from './orders';
import { useStore } from '@store';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';

const DisplayDetails = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const displayId = decodeURIComponent(route.params?.id || '');
    const routeDisplayType = String(route.params?.displayType || '').toLowerCase();
    const { ppcColors } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const displayQueueStore = useStore('displays');
    const { actions, getters } = displayQueueStore;
    const { item: display } = getters;
    const effectiveDisplayType = String(display?.displayType || routeDisplayType || '').toLowerCase();
    const isTvDisplay = effectiveDisplayType === 'tv';

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: !isTvDisplay,
        });

        if (route.params?.hideBottomToolBar !== isTvDisplay) {
            navigation.setParams({ hideBottomToolBar: isTvDisplay });
        }
    }, [navigation, isTvDisplay, route.params?.hideBottomToolBar]);

    useEffect(() => {
        if (displayId) actions.get(displayId);
    }, [actions, displayId]);

    if (effectiveDisplayType === 'products') {
        return <ProductsDisplay display={display} />;
    }

    if (effectiveDisplayType === 'orders' || effectiveDisplayType === 'tv') {
        return <OrdersDisplay display={display} isTvDisplay={isTvDisplay} />;
    }

    if (!display?.id || !display?.displayType) {
        return (
            <View style={styles.loadingWrap}>
                <View style={styles.loadingCard}>
                    <View style={[styles.skeletonLine, styles.skeletonTitle]} />
                    <View style={[styles.skeletonLine, styles.skeletonRow]} />
                    <View style={[styles.skeletonLine, styles.skeletonRow]} />
                    <View style={[styles.skeletonLine, styles.skeletonButton]} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.loadingWrap}>
            <View style={styles.loadingCard}>
                <Text style={styles.fallbackTitle}>Display sem tipo mapeado</Text>
                <Text style={styles.fallbackText}>
                    O tipo "{String(display?.displayType || '-')}" ainda nao possui tela de detalhes.
                </Text>
            </View>
        </View>
    );
};

const createStyles = (ppcColors) =>
    StyleSheet.create({
        loadingWrap: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
            paddingHorizontal: 12,
            paddingTop: 10,
        },
        loadingCard: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBg,
            padding: 14,
            gap: 10,
        },
        skeletonLine: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.cardBgSoft,
            height: 12,
        },
        skeletonTitle: {
            width: '54%',
            height: 15,
        },
        skeletonRow: {
            width: '100%',
        },
        skeletonButton: {
            width: '42%',
            height: 28,
        },
        fallbackTitle: {
            color: ppcColors.textPrimary,
            fontSize: 18,
            lineHeight: 22,
            fontWeight: '900',
        },
        fallbackText: {
            color: ppcColors.textSecondary,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: '600',
        },
    });

export default DisplayDetails;
