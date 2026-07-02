import React from 'react';
import {useNavigationState} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';

export default function PPCToolbar({navigation}) {
  const state = useNavigationState(currentState => currentState);
  const activeTab = state?.routes?.[state.index]?.name || 'HomePage';
  const insets = useSafeAreaInsets();
  const items = [
    {
      route: 'HomePage',
      icon: 'home',
      label: 'Home',
    },
    {
      route: 'ProfilePage',
      icon: 'user',
      label: 'Profile',
    },
  ];

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={{primary: '#0EA5E9', textSecondary: '#64748B', background: '#FFFFFF', border: '#D7E1EC'}}
      insets={insets}
      items={items}
      navigation={navigation}
    />
  );
}
