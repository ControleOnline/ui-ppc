import { StyleSheet } from 'react-native';

const createStyles = ppcColors =>
    StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.52)',
        },
        container: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 24,
        },
        backdropTouch: {
            ...StyleSheet.absoluteFillObject,
        },
        sheet: {
            width: '100%',
            maxHeight: '92%',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ppcColors.border,
            backgroundColor: ppcColors.modalBg || ppcColors.appBg,
            overflow: 'hidden',
        },
        eyebrow: {
            marginBottom: 8,
            paddingHorizontal: 14,
            paddingTop: 10,
            color: ppcColors.accent,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 20,
        },
    });

export default createStyles;
