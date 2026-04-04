<template>
  <q-page>
    <div class="row full-height-vh">
      <InOut
        v-if="loaded['status_in']"
        :orders="orders['status_in']"
        :status_in="status_in"
        :status_working="status_working"
        @reload="onRequest"
      />
      <Working
        v-if="loaded['status_working']"
        :orders="orders['status_working']"
        :status_working="status_working"
        :status_out="status_out"
        @reload="onRequest"
      />
      <InOut
        v-if="loaded['status_out']"
        :orders="orders['status_out']"
        :status_in="status_out"
        @reload="onRequest"
      />
    </div>
  </q-page>
</template>

<script>
import InOut from "./Status/InOut.vue";
import Working from "./Status/Working.vue";
import Config from "@controleonline/ui-common/src/utils/config";
import { mapActions, mapGetters } from "vuex";

export default {
  components: {
    InOut,
    Working,
  },
  data() {
    return {
      loaded: [],
      config: new Config(),
      status_in: null,
      status_working: null,
      status_out: null,
      queues: [],
      orders: {
        display: null,
        status_in: [],
        status_working: [],
        status_out: [],
      },
    };
  },
  created() {
    this.display = decodeURIComponent(this.$route.params.id);
    this.onRequest();
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      user: "auth/user",
    }),
  },
  watch: {
    myCompany(company) {
      this.onRequest();
    },
  },
  methods: {
    ...mapActions({
      getOrderProductQueues: "order_products_queue/getItems",
      getQueuesFromDisplay: "display_queues/getItems",
    }),

    async onRequest() {
      this.orders.status_in = [];
      this.orders.status_working = [];
      this.orders.status_out = [];
      this.loaded = [];

      const rows = this.getResponsiveItemsPerPage();

      const result = await this.getQueuesFromDisplay({ display: this.display });

      const statusInIds = [];
      const statusWorkingIds = [];
      const statusOutIds = [];

      result.forEach((item) => {
        this.queues.push(item.queue.id);
        statusInIds.push(item.queue.status_in.id);
        statusWorkingIds.push(item.queue.status_working.id);
        statusOutIds.push(item.queue.status_out.id);

        this.status_in = item.queue.status_in;
        this.status_working = item.queue.status_working;
        this.status_out = item.queue.status_out;
      });

      await Promise.all([
        this.getMyOrders("status_in", statusInIds, rows),
        this.getMyOrders("status_working", statusWorkingIds, rows),
        this.getMyOrders("status_out", statusOutIds, rows),
      ]);
    },

    getResponsiveItemsPerPage() {
      if (this.$q.screen.gt.md) return 6;
      if (this.$q.screen.gt.xs) return 4;
      return 1;
    },

    async getMyOrders(status, status_ids, rows) {
      if (!status_ids.length) return;

      return await this.getOrderProductQueues({
        status: status_ids,
        itemsPerPage: rows,
        "order_product.order.provider": this.myCompany.id,
      })
        .then((result) => {
          this.orders[status] = result;
        })
        .finally(() => {
          this.loaded[status] = true;
        });
    },
  },
};
</script>

<style>
.full-height-vh {
  height: calc(100vh - 16px) !important;
}

.video-height {
  height: calc(100% - 130px) !important;
}
</style>
