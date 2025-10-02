<template>
    <v-app-bar :elevation="2" density="compact" color="app-bar" class="sticky-app-bar">
        <v-app-bar-title>{{ isGliddencup ? 'GliddenCup' : 'Draft Finder' }}</v-app-bar-title>

        <v-spacer></v-spacer>

        <!-- Toggle Button -->
        <v-btn variant="outlined" color="secondary" class="mr-2" @click="toggleNav">
            {{ isGliddencup ? 'Zum Draft Finder' : 'Zum Gliddencup' }}
        </v-btn>

        <!-- Theme Button -->
        <v-btn icon @click="toggleTheme">
            <v-icon>mdi-theme-light-dark</v-icon>
        </v-btn>
    </v-app-bar>
</template>

<script>
import { useTheme } from 'vuetify'
import { useRouter, useRoute } from 'vue-router'

export default {
    data() {
        return {
            theme: useTheme()
        }
    },
    computed: {
        isGliddencup() {
            return this.$route.path.startsWith('/gliddencup')
        }
    },
    methods: {
        toggleTheme() {
            this.theme.global.name = this.theme.global.name === 'dark' ? 'light' : 'dark'
        },
        toggleNav() {
            if (this.isGliddencup) {
                this.$router.push('/')          // von Gliddencup zurück zum Draft Finder
            } else {
                this.$router.push('/gliddencup') // vom Draft Finder zum Gliddencup
            }
        }
    }
}
</script>