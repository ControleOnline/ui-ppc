export const routes = [
  {
    path: "/displays",
    component: () => import("@controleonline/ui-layout/src/vue/layouts/AdminLayout.vue"),
    children: [
      {
        name: "displayList",
        path: "",
        component: () => import("../pages/Displays/Displays.vue"),
      },
      {
        name: "displayDetails",
        path: "id/:id",
        component: () => import("../pages/Displays/Details.vue"),
      }
    ],
  },

];
