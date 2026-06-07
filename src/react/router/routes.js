import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayOrderConference from '@controleonline/ui-ppc/src/react/pages/displays/orders/DisplayOrderConference';

const shopRoutes = [

  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs','title','ppc'),
      showBottomToolBar: true,
    },
  },
  {
    name: 'DisplayOrderConference',
    component: DisplayOrderConference,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Conferencia',
      showBottomToolBar: false,
    },
  },
];

export default shopRoutes;
