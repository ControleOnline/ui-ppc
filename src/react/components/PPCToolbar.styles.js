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
    },
    toolbar: {
      minHeight: 60,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: Math.max(insets?.bottom || 0, 10),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#D7E1EC',
      backgroundColor: '#FFFFFF',
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
