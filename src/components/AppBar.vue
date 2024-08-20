<template>
    <v-app-bar :elevation="2" density="compact" color="app-bar" class="sticky-app-bar">
        <v-app-bar-title>Draft Finder</v-app-bar-title>
<!-- 
        <v-dialog max-width="500">
            <template v-slot:activator="{ props: showInfoBox }">
                <v-btn icon v-bind="showInfoBox">
                    <v-icon>mdi-information-outline</v-icon>
                </v-btn>
            </template>
            <template v-slot:default="{ isActive }">
                <v-card title="Q&A">
                    <v-card-text>
                        <h3>Why</h3>
                        <p>Reasons.</p>
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer></v-spacer>

                        <v-btn text="Schließen" @click="isActive.value = false"></v-btn>
                    </v-card-actions>
                </v-card>
            </template>
        </v-dialog> 
-->

        <v-btn icon @click="toggleTheme">
            <v-icon>mdi-theme-light-dark</v-icon>
        </v-btn>
    </v-app-bar>


</template>

<script>
import { useTheme } from 'vuetify'

export default {
    data() {
        return {
            theme: useTheme(),
            showInfoBox: false
        };
    },
    methods: {
        toggleTheme() {
            this.theme.global.name = this.theme.global.name == 'dark' ? 'light' : 'dark';
        },
        toggleInfoBox() {
            this.showInfoBox = true;
        }
    },
};
</script>