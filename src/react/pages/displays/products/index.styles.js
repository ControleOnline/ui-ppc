import { StyleSheet } from 'react-native';

const createStyles = (ppcColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        tabsContainer: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        tabsCard: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        sceneContainer: {
            flex: 1,
            backgroundColor: ppcColors.appBg,
        },
        tabBar: {
            flexDirection: 'row',
            backgroundColor: ppcColors.cardBg,
            borderBottomWidth: 1,
            borderBottomColor: ppcColors.borderSoft,
        },
        tabButton: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingTop: 8,
        },
        tabIndicator: {
            alignSelf: 'stretch',
            height: 3,
            backgroundColor: 'transparent',
            borderRadius: 999,
        },
        tabIndicatorActive: {
            backgroundColor: ppcColors.accent,
        },
        tabLabelWrap: {
            minHeight: 54,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            gap: 2,
        },
        tabLabelTitle: {
            color: ppcColors.textSecondary,
            fontSize: 11,
            lineHeight: 13,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        tabLabelTitleActive: {
            color: ppcColors.textPrimary,
        },
        tabLabelCount: {
            color: ppcColors.textSecondary,
            fontSize: 22,
            lineHeight: 24,
            fontWeight: '900',
        },
        tabLabelCountActive: {
            color: ppcColors.textPrimary,
        },
        scenePanel: {
            flex: 1,
        },
        sceneVisible: {
            display: 'flex',
        },
        sceneHidden: {
            display: 'none',
        },
    });

export default createStyles;
