<template>
  <DefaultTable :configs="configs" v-if="configs" />
</template>
<script>

import { mapActions, mapGetters } from "vuex";

export default {
  components: {
    
  },
  computed: {
    ...mapGetters({

    }),
    configs() {
      return {
        store: 'displays',
        add: true,
        selection: false,
        search: {
        },
      };
    }
  },
  data() {
    return {



    };
  },
  created() {
  },
  methods: {
  },
};
</script>