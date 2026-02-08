import HomePage from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import PPCLayout from '@controleonline/ui-layout/src/react/layouts/PPCLayout';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';

const withLayout = Component => props => (
  <PPCLayout navigation={props.navigation}>
    <Component {...props} />
  </PPCLayout>
);

const shopRoutes = [
  {
    name: 'HomePage',
    component: withLayout(HomePage),
    options: {
      headerShown: false,
      title: 'Menu',
    },
  },
  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: {
      headerShown: false,
      title: 'PCP',
      headerBackButtonMenuEnabled: true,
    },
  },
];

export default shopRoutes;
