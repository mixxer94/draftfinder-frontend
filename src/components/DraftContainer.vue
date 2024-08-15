<script>
import axios from 'axios';

export default {
    props: {
        filters: {
            type: Object,
            required: true
        }
    },
    methods: {
        getNameByProfileId(draft) {
            return draft.nameHost
        },
        openDraft(draft) {
            window.open(`https://aoe2cm.net/draft/${draft.draftId}`, '​_blank​');
        },
        loadDrafts(params) {
            console.info('params for fetch', params)
            let _params = {};
            if (this.filters && this.filters.presetId) {
                _params.presetId = this.filters.presetId;
            }
            if (this.filters && this.filters.profileId) {
                _params.profileId = this.filters.profileId;
            }
            if (this.filters && this.filters.liga) {
                _params.liga = this.filters.liga;
            }

            axios.get('/api/drafts', { params: _params })
                .then(response => {
                    this.filteredDrafts = response?.data; // Store the draft details
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
                this.loadDrafts(this.filters)
            },
            deep: true
        },
    },
    computed: {
        mappedItems() {
            return this.filteredDrafts?.map((element) => {
                element.created_at = new Date(element.created_at).toLocaleString('de-DE', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                element.liga = element.ligaHost;
                element.hostName = this.getNameByProfileId(element.profileIdHost);
                element.guestName = this.getNameByProfileId(element.profileIdGuest);
                return element;
            });
        }
    },
    data() {
        return {
            filteredDrafts: [],
            headers: [{
                title: 'Datum',
                key: 'created_at',
                order: "desc"
            }, {
                title: 'Liga',
                key: 'liga'
            }, {
                title: 'Host',
                key: 'nameHost'
            }, {
                title: 'Gast',
                key: 'nameGuest'
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
                <v-btn append-icon="mdi-open-in-new" variant="plain" @click="openDraft(item)">
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