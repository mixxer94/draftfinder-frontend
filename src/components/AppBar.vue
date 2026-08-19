<template>
    <v-app-bar :elevation="2" density="compact" color="app-bar" class="sticky-app-bar">
        <v-app-bar-title>{{ title }}</v-app-bar-title>

        <v-spacer></v-spacer>

        <!-- Zurueck zum Draft Finder -->
        <v-btn v-if="isBillyTracker" variant="outlined" color="secondary" class="mr-2" @click="$router.push('/')">
            Zum Draft Finder
        </v-btn>

        <!-- Toggle Button -->
        <v-btn v-if="!isGliddencup && !isBillyTracker" variant="outlined" color="secondary" class="mr-2" @click="toggleNav">
            Zum Gliddencup
        </v-btn>

        <!-- Theme Button -->
        <v-btn v-if="!isGliddencup" icon @click="toggleTheme">
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
        },
        isBillyTracker() {
            return this.$route.path.startsWith('/billy-tracker')
        },
        title() {
            if (this.isGliddencup) return 'GliddenCup'
            if (this.isBillyTracker) return 'Billy Tracker'
            return 'Draft Finder'
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