import React, {useMemo} from 'react';
import {useNavigationState} from '@react-navigation/native';
import {useStore} from '@store';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';
import {
  getBottomNavigationPreset,
  resolveBottomNavigationItems,
  resolveBottomNavigationRoute,
} from '@controleonline/ui-common/src/react/components/BottomNavigationBar.config';

export default function PPCToolbar({navigation}) {
  const state = useNavigationState(currentState => currentState);
  const activeTab = state?.routes?.[state.index]?.name || 'HomePage';
  const preset = getBottomNavigationPreset('ppcDock');
  const items = useMemo(
    () => resolveBottomNavigationItems(preset.items),
    [preset.items],
  );
  const resolvedActiveRoute = resolveBottomNavigationRoute(
    preset.routeAliases,
    activeTab,
  );
  const peopleStore = useStore('people');
  const {currentCompany} = peopleStore.getters;

  return (
    <BottomNavigationBar
      activeRouteName={resolvedActiveRoute}
      colors={{
        primary: '#0EA5E9',
        textSecondary: '#64748B',
        background: '#FFFFFF',
        border: '#D7E1EC',
      }}
      disabled={!currentCompany || Object.entries(currentCompany).length === 0}
      items={items}
      navigation={navigation}
    />
  );
}
