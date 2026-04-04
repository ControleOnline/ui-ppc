import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';

const shopRoutes = [

  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t('configs','title','ppc'),
      showBottomToolBar: true,
    },
  },
];

export default shopRoutes;
