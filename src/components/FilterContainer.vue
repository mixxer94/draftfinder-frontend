<template>
    <v-container>
        <v-label>
            Filter Drafts per ...
        </v-label>
        <v-form>
            <v-autocomplete clearable label="Liga" :items="ligen" item-title="beschreibung" item-value="liga"
                v-model="localFilters.liga" @update:modelValue="emitFilters('profileId')"></v-autocomplete>

            <v-autocomplete clearable label="Teilnehmer" :items="participantsByLiga" item-title="name" item-value="profileId"
                v-model="localFilters.profileId" @update:modelValue="emitFilters()"></v-autocomplete>
        </v-form>
        <v-btn rounded="xl" variant="tonal" @click="setPreset()"
            :color="!localFilters.presetId ? 'primary' : 'default'">
            Alle Drafts
        </v-btn>
        <br /><br />
        <v-btn rounded="xl" variant="tonal" @click="setPreset('CuTUL')"
            :color="localFilters.presetId === 'CuTUL' ? 'primary' : 'default'">
            Civdrafts
        </v-btn>
        <br /><br />
        <v-btn rounded="xl" variant="tonal" @click="setPreset('Mtmcc')"
            :color="localFilters.presetId === 'Mtmcc' ? 'primary' : 'default'">
            Mapdrafts (Liga 1-5)
        </v-btn>
        <br /><br />
        <v-btn rounded="xl" variant="tonal" @click="setPreset('RshyE')"
            :color="localFilters.presetId === 'RshyE' ? 'primary' : 'default'">
            Mapdrafts (Liga 6-9)
        </v-btn>
    </v-container>
</template>

<script>
export default {
    props: ['filters', 'participants'],
    data() {
        return {
            localFilters: { ...this.filters },
            localParticipants: [...this.participants],
            ligen: [{
                "liga": 1, "beschreibung": "Liga 1"
            }, {
                "liga": 2, "beschreibung": "Liga 2"
            }, {
                "liga": 3, "beschreibung": "Liga 3"
            }, {
                "liga": 4, "beschreibung": "Liga 4"
            }, {
                "liga": 5, "beschreibung": "Liga 5"
            }, {
                "liga": 6, "beschreibung": "Liga 6"
            }, {
                "liga": 7, "beschreibung": "Liga 7"
            }, {
                "liga": 8, "beschreibung": "Liga 8"
            }, {
                "liga": 9, "beschreibung": "Liga 9"
            }]
        };
    },
    watch: {
        participants: {
            handler(newParticipants) {
                this.localParticipants = [...newParticipants];
            },
            deep: true,
            immediate: true // Ensure immediate update on mount
        },
    },
    computed: {
        participantsByLiga() {
            if (this.localFilters.liga)
                return this.localParticipants.filter((el) => el.liga == this.localFilters.liga);
            else
                return this.localParticipants
        }
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