import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "display_queues",
    isLoading: false,
    isSaving: false,
    error: "",
    violations: null,
    totalItems: 0,
    summary: {},
    message: {},
    messages: [],
    columns: [],
  },
  actions,
  getters,
  mutations,
};
