<template>
  <AppBar />

  <v-row>
    <v-col cols="12" md="4" :class="{ 'sticky-filter': isMdAndUp }">
      <FilterContainer :filters="filters" :participants="participants" @update-filters="updateFilters" />
    </v-col>
    <v-col cols="12" md="8">
      <DraftContainer :filters="filters" :participants="participants" />
      
    </v-col>
  </v-row>
  <footer>
    draftfinder.de was created under Microsoft's <a href="https://www.xbox.com/en-US/developers/rules">"Game Content Usage Rules"</a> using assets from Age of Empires II: Definitive Edition, and it is not endorsed by or affiliated with Microsoft.
  </footer>
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
  top: 36px;
  height: calc(100vh - 36px);
  overflow-y: auto;
}

footer {
  font-size: 14px;
  color:grey;
  padding:12px;
}
</style>