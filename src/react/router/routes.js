import HomePage from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DefaultLayout from '@controleonline/ui-layout/src/react/layouts/DefaultLayout';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';

const withLayout = Component => props => (
  <DefaultLayout navigation={props.navigation}>
    <Component {...props} />
  </DefaultLayout>
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
