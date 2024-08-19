<template>
    <v-app-bar :elevation="2" density="compact" color="primary" class="sticky-app-bar">
        <v-app-bar-title>Draft Finder</v-app-bar-title>

        <template v-slot:append>
            <v-btn icon @click="toggleTheme">
                <v-icon>mdi-theme-light-dark</v-icon>
            </v-btn>
        </template>
    </v-app-bar>
</template>

<script>
import { useTheme } from 'vuetify'

export default {
    data() {
        return {
            theme: useTheme()
        };
    },
    methods: {
        toggleTheme() {
            this.theme.global.name = this.theme.global.name == 'dark' ? 'light' : 'dark';
        }
    },
};
</script>