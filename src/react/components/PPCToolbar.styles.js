import {Platform, StyleSheet} from 'react-native';

const createStyles = insets =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
      paddingBottom: Math.max(insets?.bottom || 0, 8),
    },
    toolbar: {
      minHeight: 64,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#D7E1EC',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      ...(Platform.OS === 'android'
        ? {elevation: 10}
        : {
            shadowColor: '#0F172A',
            shadowOpacity: 0.12,
            shadowRadius: 14,
            shadowOffset: {width: 0, height: -6},
          }),
    },
    button: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    buttonText: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 6,
      textAlign: 'center',
      fontWeight: '600',
    },
    activeText: {
      color: '#0EA5E9',
      fontWeight: '800',
    },
  });

export default createStyles;
