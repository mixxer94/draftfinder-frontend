<template>
    <v-container>
        <v-form>
            <v-autocomplete clearable label="Draft" :items="presets" item-title="title" item-value="presetId"
                v-model="localFilters.presetId" @update:modelValue="emitFilters()"></v-autocomplete>
        </v-form>
    </v-container>
</template>

<script>
import axios from 'axios';

export default {
    props: ['filters', 'presets'],
    data() {
        return {
            localFilters: { ...this.filters }
        };
    },
    methods: {
        setPreset(presetId) {
            this.localFilters.presetId = presetId;
            this.emitFilters();
        },
        emitFilters(fieldToClear) {
            if (fieldToClear == 'liga')
                this.localFilters.liga = null
            else if (fieldToClear == 'profileId')
                this.localFilters.profileId = null

            this.$emit('update-filters', this.localFilters);
        }
    }
};
</script>