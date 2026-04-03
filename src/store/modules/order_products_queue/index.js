import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "order_product_queues",
    isLoading: false,
    isSaving: false,
    error: "",
    violations: null,
    totalItems: 0,
    summary: {},
    message: {},
    messages: [],
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
  actions,
  getters,
  mutations,
};
