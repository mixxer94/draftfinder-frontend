<script>
import axios from 'axios';

export default {
    props: {
        filters: {
            type: Object,
            required: true
        },
        participants: {
            type: Array,
            required: true
        }
    },
    methods: {
        getNameByProfileId(profileId) {
            return this.participants.filter(p => { return p.profileId == profileId })[0]?.name
        },
        getDraftType(draft) {
            return draft.presetId === 'CuTUL' ? 'CIVS' : 'MAPS';
        },
        openDraft(draft) {
            window.open(`https://aoe2cm.net/draft/${draft.draftId}`, '​_blank​');
        },
        updateFilters(filters) {
            this.localFilters = filters
        },
        loadDrafts() {
            axios.get('/api/drafts', { params: { actions: true } })
                .then(response => {
                    this.drafts = response?.data; // Store the draft details
                })
                .catch(error => {
                    console.error('Error fetching draft:', error);
                });
        }
    },
    mounted() {
        this.loadDrafts()
    },
    watch: {
        filters: {
            handler() {
                this.updateFilters(this.filters);
            },
            deep: true
        },
        participants: {
            handler(participants) {
                this.localParticipants = [...participants];
            },
            deep: true,
        },
    },
    computed: {
        mappedItems() {
            let filteredDrafts = this.drafts.map((element) => {
                const formatter = Intl.DateTimeFormat('de-DE', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let date = new Date(element.created_at);
                element.formattedDate = formatter.format(date);
                element.liga = element.ligaHost;
                element.draft_type = this.getDraftType(element);
                element.hostName = this.getNameByProfileId(element.profileIdHost);
                element.guestName = this.getNameByProfileId(element.profileIdGuest);

                return element;
            });

            if (!this.localFilters.liga && !this.localFilters.presetId && !this.localFilters.profileId)
                return filteredDrafts.sort((a, b) => new Date(b["created_at"]) - new Date(a["created_at"]));
            else {
                return filteredDrafts
                    .filter(el => el.ligaHost === this.localFilters.liga || !this.localFilters.liga)
                    .filter(el => el.profileIdHost === this.localFilters.profileId || el.profileIdGuest === this.localFilters.profileId || !this.localFilters.profileId)
                    .filter(el => el.presetId === this.localFilters.presetId || !this.localFilters.presetId)
                    .sort((a, b) => new Date(b["created_at"]) - new Date(a["created_at"]))
            }
        }
    },
    data() {
        return {
            drafts: [],
            localParticipants: [],
            localFilters: {}, 

            headers: [{
                title: 'Datum',
                key: 'formattedDate',
                order: "desc"
            }, {
                title: 'Typ',
                key: 'draft_type'
            }, {
                title: 'Liga',
                key: 'liga'
            }, {
                title: 'Host',
                key: 'hostName'
            }, {
                title: 'Gast',
                key: 'guestName'
            }, {
                title: '',
                key: 'actions',
                sortable: false
            }]
        }

    }
}
</script>

<template>
    <v-container>
        <v-data-table :headers="headers" :items="mappedItems" :items-per-page="-1" hide-default-footer>
            <template v-slot:item.actions="{ item }">
                <v-btn append-icon="mdi-open-in-new" variant="tonal" color="secondary" @click="openDraft(item)">
                    öffnen
                </v-btn>
            </template>
        </v-data-table>
    </v-container>
</template>

<style scoped>
.v-container {
    padding: 12px;
}
</style>