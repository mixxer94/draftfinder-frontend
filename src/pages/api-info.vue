<template>
  <AppBar />
</template>

<script>
import { useDisplay } from 'vuetify'
import axios from 'axios';
import FilterContainer from '../components/FilterContainer.vue';
import DraftContainer from '../components/DraftContainer.vue';
import AppBar from '../components/AppBar.vue';

export default {
  components: {
    FilterContainer,
    DraftContainer,
    AppBar
  },

  data() {
    return {
      filters: {
        liga: null,
        profileId: null,
        presetId: null
      },
      participants: []
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
  top: 32px;
  height: calc(100vh - 32px);
  overflow-y: auto;
}
</style>