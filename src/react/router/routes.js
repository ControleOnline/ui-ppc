import HomePage from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import PPCLayout from '@controleonline/ui-layout/src/react/layouts/PPCLayout';

const WrappedHomePage = ({navigation}) => (
  <PPCLayout navigation={navigation}>
    <HomePage navigation={navigation} />
  </PPCLayout>
);

const shopRoutes = [
  {
    name: 'HomePage',
    component: WrappedHomePage,
    options: {
      headerShown: false,
      title: 'Menu',
    },
  },
];

export default shopRoutes;
