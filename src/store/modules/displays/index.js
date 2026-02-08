import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "displays",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: "id",
        align: "left",
        label: "id",
        sum: false,
        to: function (column) {
          return {
            name: "displayDetails",
            params: { id: column.id },
          };
        },
        format: function (value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "display",
        align: "left",
        label: "display",
        sum: false,
        format: function (value) {
          return value;
        },
      },
      {
        list: [
          { label: "displayType.production", value: "production" },
          { label: "displayType.delivery", value: "delivery" },
          { label: "displayType.display", value: "display" },
        ],
        sortable: true,
        name: "displayType",
        align: "left",
        label: "displayType",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        list: function () {
          return this.$store.getters["people/companies"];
        },
        name: "company",
        align: "left",
        label: "company",
        format: function (value) {
          return value;
        },
        saveFormat: function (company) {
          return "/people/" + company.value;
        },
      },
    ],
  },
  actions: actions,
  getters,
  mutations,
};
