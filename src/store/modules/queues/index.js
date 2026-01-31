import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import * as customActions from "./customActions";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    filters: {},
    resourceEndpoint: "queues",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: "id",
        align: "left",
        label: "id",
        sum: false,
        format: function (value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "queue",
        align: "left",
        label: "queue",
        sum: false,
        format: function (value) {
          return value;
        },
      },
    ],
  },
  actions: { ...actions, ...customActions },
  getters,
  mutations,
};
