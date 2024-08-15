<template>
  <v-app-bar :elevation="2" density="compact" color="primary" class="sticky-app-bar">
    <v-app-bar-title>DraftFinder</v-app-bar-title>

    <template v-slot:append>
      <v-btn icon @click="toggleTheme">
        <v-icon>mdi-theme-light-dark</v-icon>
      </v-btn>
    </template>
  </v-app-bar>


  <v-row>
    <v-col cols="12" md="4" :class="{ 'sticky-filter': isMdAndUp }">
      <FilterContainer :filters="filters" :participants="participants" @update-filters="updateFilters" />
    </v-col>
    <v-col cols="12" md="8">
      <DraftContainer :filters="filters" :participants="participants" />
    </v-col>
  </v-row>

</template>

<script>
import { useTheme, useDisplay } from 'vuetify'
import axios from 'axios';
import FilterContainer from '../components/FilterContainer.vue';
import DraftContainer from '../components/DraftContainer.vue';

export default {
  components: {
    FilterContainer,
    DraftContainer
  },

  data() {
    return {
      filters: {
        liga: null,
        profileId: null,
        presetId: null
      },
      participants: [],
      theme: useTheme()
    };
  },
  methods: {
    loadParticipants() {
      axios.get('/api/participants')
        .then(response => {
          this.participants = response.data;
        })
        .catch(error => {
          console.error('Error fetching message:', error);
        });
    },
    updateFilters(newFilters) {
      this.filters = { ...this.filters, ...newFilters };
    },
    toggleTheme() {
      this.theme.global.name = this.theme.global.name == 'dark' ? 'light' : 'dark';
    }
  },
  setup() {
    const { mdAndUp } = useDisplay();
    return { isMdAndUp: mdAndUp };
  },
  mounted() {
    this.loadParticipants()
  },
};
</script>

<style scoped>
.fixed-app-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.sticky-filter {
  position: sticky;
  top: 64px;
  /* Adjust this value based on the height of your app bar */
  height: calc(100vh - 64px);
  /* Adjust this value based on the height of your app bar */
  overflow-y: auto;
}
</style>