import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { BackHandler, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import ProductsDisplay from './products';
import OrdersDisplay from './orders';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import {
    buildForcedDisplayParams,
    doesDisplayBelongToCompany,
    normalizeEntityId,
    resolveForcedDisplayId,
} from '@controleonline/ui-ppc/src/react/utils/forcedDisplay';

const DisplayDetails = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const routeDisplayType = String(route.params?.displayType || '').toLowerCase();
    const displayId = normalizeEntityId(route.params?.id);
    const { ppcColors, currentCompany } = useDisplayTheme();
    const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

    const displayStore = useStore('displays');
    const deviceConfigStore = useStore('device_config');
    const { actions, getters } = displayStore;
    const { item: display } = getters;
    const { item: deviceConfig } = deviceConfigStore.getters;
    const forcedDisplayId = useMemo(
        () => resolveForcedDisplayId(deviceConfig),
        [deviceConfig?.configs],
    );
    const isForcedDisplay = forcedDisplayId !== null && displayId === forcedDisplayId;
    const effectiveDisplayType = String(display?.displayType || routeDisplayType || '').toLowerCase();
    const isTvDisplay = effectiveDisplayType === 'tv';
    const shouldHideNavigation = isTvDisplay || isForcedDisplay;

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: !shouldHideNavigation,
            headerBackVisible: !isForcedDisplay,
            gestureEnabled: !isForcedDisplay,
        });

        if (
            route.params?.hideBottomToolBar !== shouldHideNavigation ||
            route.params?.forcedDisplay !== isForcedDisplay
        ) {
            navigation.setParams({
                hideBottomToolBar: shouldHideNavigation,
                forcedDisplay: isForcedDisplay,
            });
        }
    }, [
        navigation,
        isForcedDisplay,
        route.params?.forcedDisplay,
        route.params?.hideBottomToolBar,
        shouldHideNavigation,
    ]);

    useEffect(() => {
        if (displayId) actions.get(displayId);
    }, [actions, displayId]);

    useEffect(() => {
        if (
            !forcedDisplayId ||
            !currentCompany?.id ||
            displayId === forcedDisplayId
        ) {
            return;
        }

        let cancelled = false;

        api.fetch(`displays/${forcedDisplayId}`)
            .then(forcedDisplay => {
                if (
                    cancelled ||
                    !forcedDisplay?.id ||
                    !doesDisplayBelongToCompany(forcedDisplay, currentCompany.id)
                ) {
                    return;
                }

                const params = buildForcedDisplayParams(forcedDisplay);
                if (!params) {
                    return;
                }

                navigation.replace('DisplayDetails', params);
            })
            .catch(() => { });

        return () => {
            cancelled = true;
        };
    }, [currentCompany?.id, displayId, forcedDisplayId, navigation]);

    useEffect(() => {
        if (!isForcedDisplay) {
            return undefined;
        }

        const unsubscribe = navigation.addListener('beforeRemove', event => {
            event.preventDefault();
        });

        return unsubscribe;
    }, [isForcedDisplay, navigation]);

    useFocusEffect(
        useCallback(() => {
            if (!isForcedDisplay) {
                return undefined;
            }

            const onHardwareBackPress = () => true;
            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onHardwareBackPress,
            );

            return () => {
                subscription.remove();
            };
        }, [isForcedDisplay]),
    );

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
