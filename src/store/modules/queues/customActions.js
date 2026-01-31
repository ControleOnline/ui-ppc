import { api } from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const ordersQueue = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISLOADING, true);
  if (getters.items != null) commit(types.SET_ITEMS, []);
  commit(types.SET_TOTALITEMS, 0);
  return api

    .fetch('/orders-queue', { params: params })
    .then(data => {
      commit(types.SET_ITEMS, data['member']);
      commit(types.SET_TOTALITEMS, data['totalItems']);

      return data['member'];
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};