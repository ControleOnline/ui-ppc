import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useNavigationState} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import createStyles from './PPCToolbar.styles';

export default function PPCToolbar({navigation}) {
  const state = useNavigationState(currentState => currentState);
  const activeTab = state?.routes?.[state.index]?.name || 'HomePage';
  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);
  const primaryColor = '#0EA5E9';
  const inactiveColor = '#64748B';

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View accessibilityRole="navigation" style={styles.toolbar} testID="bottom-navigation">
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => navigation.navigate('HomePage')}
          style={styles.button}
        >
          <Icon
            name="home"
            size={18}
            color={activeTab === 'HomePage' ? primaryColor : inactiveColor}
          />
          <Text style={[styles.buttonText, activeTab === 'HomePage' && styles.activeText]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => navigation.navigate('ProfilePage')}
          style={styles.button}
        >
          <Icon
            name="user"
            size={18}
            color={activeTab === 'ProfilePage' ? primaryColor : inactiveColor}
          />
          <Text style={[styles.buttonText, activeTab === 'ProfilePage' && styles.activeText]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
