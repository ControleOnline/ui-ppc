<template>
  <div class="col-12 q-pa-sm">
    <q-card class="full-width">
      <q-card-section>
        <div class="text-subtitle">
          {{ $tt("display", "title", status_in.status) }}
        </div>
      </q-card-section>
      <q-separator />
      <q-list class="row">
        <q-item
          v-for="(order, index) in orders"
          :key="index"
          class="col-12 col-sm-4 col-md-3 col-lg-2 q-pa-sm"
        >
          <q-card class="q-mb-md full-width">
            <q-card-section>
              <q-item-label>
                {{ $tt("display", "label", "Order") }} #{{
                  order.order_product.order.id
                }}
              </q-item-label>
              <q-item-label>
                {{ order.order_product.order.client?.name }}
              </q-item-label>
              <q-item-label caption>
                <q-icon
                  v-if="order.status?.icon"
                  :color="order.status?.color"
                  :name="order.status?.icon"
                  class="q-mr-sm"
                />
                <q-item-label caption>
                  Horário do pedido:
                  {{
                    new Date(order.registerTime).toLocaleTimeString("pt-br", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }}
                </q-item-label>
                <q-item-label caption v-if="order.registerTime != order.updateTime">
                  Iniciou nesse status:
                  {{
                    new Date(order.updateTime).toLocaleTimeString("pt-br", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }}
                </q-item-label>
              </q-item-label>
            </q-card-section>
            <q-card-section>
              <q-item-label caption>
                {{ order.order_product.quantity }}
                {{ order.order_product.product.product }}(s)
              </q-item-label>
            </q-card-section>
            <q-card-actions v-if="status_working">
              <q-btn
                class="full-width"
                color="primary"
                :label="$tt('display', 'btn', 'start')"
                @click="start(order)"
              />
            </q-card-actions>
          </q-card>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>
<script>
import { mapActions, mapGetters } from "vuex";

export default {
  props: {
    status_in: {
      requered: true,
    },
    status_working: {
      default: null,
    },
    status_out: {
      default: null,
    },
    orders: {
      requered: true,
    },
  },
  methods: {
    ...mapActions({
      setOrderProductQueues: "order_products_queue/save",
    }),
    start(order) {
      this.setOrderProductQueues({
        id: order.id,
        status: this.status_working["@id"],
      }).finally(() => {
        this.$emit("reload");
      });
    },
  },
};
</script>
