<template>
  <q-page>
    <div class="q-pa-md row q-gutter-md">
      <q-card
        v-for="display in displays"
        :key="display.id"
        class="display-card col-4 col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-3"
      >
        <q-card-actions>
          <div class="q-gutter-sm items-center row full-width">
            <img
              :src="$image(display.company.file)"
              class="display current-logo"
              v-if="$image(display.company.file)"
            />
            <span v-else> {{ display.company.alias }}</span>
          </div>
          <div class="col-auto justify-end icon-absolute-right">
            <q-btn
              v-if="display.displayType == 'delivery'"
              fab
              class="btn-primary"
              icon="place"
              @click="openDisplay(display)"
            />
            <q-btn
              v-if="display.displayType == 'display'"
              fab
              class="btn-positive"
              icon="done"
              @click="openDisplay(display)"
            />
            <q-btn
              v-if="display.displayType == 'production'"
              fab
              class="btn-primary"
              icon="receipt_long"
              @click="openDisplay(display)"
            />
          </div>
        </q-card-actions>
        <q-separator />
        <q-card-section class="full-width">
          <div class="row no-wrap items-center q-col-gutter-md justify-between">
            <div class="col text-h6 ellipsis">
              {{ display.display }}
            </div>
            <div
              class="col-auto text-grey text-caption q-pt-md row no-wrap items-center"
            >
              <q-icon name="place" />
              250 ft
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-subtitle1">
            {{ $t("display.types." + display.displayType) }}
          </div>
          <div class="text-caption text-grey">
            {{ $t("display.messages." + display.displayType) }}
          </div>
        </q-card-section>
        <q-card-section class="full-width">
          <q-btn
            @click="openDisplay(display)"
            label="Open"
            class="btn-primary full-width"
          ></q-btn>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>
<script>
import { mapActions, mapGetters } from "vuex";

export default {
  data() {
    return {
      isSearching: false,
      displays: [],
    };
  },
  computed: {
    ...mapGetters({
      user: "auth/user",
      defaultCompany: "people/defaultCompany",
      myCompany: "people/currentCompany",
    }),
  },
  created() {
    this.onRequest();
  },
  watch: {
    myCompany(company) {
      this.onRequest();
    },
  },
  methods: {
    ...mapActions({
      getDisplays: "displays/getItems",
    }),
    onRequest() {
      this.getMyDisplays();
    },
    openDisplay(display) {
      this.$router.push({
        name: "displayDetails",
        params: { id: display.id },
      });
    },
    getMyDisplays() {
      this.isSearching = true;
      return this.getDisplays({
        company: this.myCompany.id,
      })
        .then((result) => {
          this.displays = result;
        })
        .finally(() => {
          this.isSearching = false;
        });
    },
  },
};
</script>

<style scoped>
.display-card {
  transition: box-shadow 0.3s ease;
}

.icon-absolute-right {
  position: absolute;
  right: 10px;
  top: 25px;
}

.display-card:hover {
  box-shadow: 0 4px 8px rgb(0 0 0 / 53%);
}
.display.current-logo {
  max-width: 80%;
}
</style>
