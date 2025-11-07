<template>
    <v-container>
        <v-data-table :headers="headers" :items="mappedItems" :items-per-page="-1" hide-default-footer
            item-value="draftId" v-model:expanded="expandedRows" density="compact">

            <template v-slot:item="{ item }">
                <tr @click="toggleExpand(item)">
                    <td v-for="header in headers" :key="header.key" class="cursor-pointer">
                        {{ item[header.key] }}
                    </td>
                    <td class="cursor-pointer">
                        <v-btn prepend-icon="mdi-open-in-new" variant="tonal" color="secondary"
                            @click.stop="openDraft(item)">
                            öffnen
                        </v-btn>
                    </td>
                    <td class="cursor-pointer">
                        <v-btn icon @click.stop="toggleExpand(item)">
                            <v-icon>{{ isRowExpanded(item) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                        </v-btn>
                    </td>
                </tr>
            </template>

            <template v-slot:expanded-row="{ item }">
                <tr>
                    <td :colspan="headers.length + 2" class="pa-0">
                        <DraftDetail :draftActions="item.actions" />
                    </td>
                </tr>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import axios from 'axios';

export default {
    props: {
        filters: {
            type: Object,
            required: true
        },
    },
    methods: {
        toggleExpand(item) {
            const index = this.expandedRows.indexOf(item.draftId);
            if (index === -1) {
                this.expandedRows.push(item.draftId);
            } else {
                this.expandedRows.splice(index, 1);
            }
        },
        isRowExpanded(item) {
            return this.expandedRows.includes(item.draftId);
        },
        openDraft(draft) {
            window.open(`https://aoe2cm.net/draft/${draft.draftId}`, '​_blank​');
        },
        loadDraftsByPresetId(presetId) {
            axios.get('/api/drafts', { params: { actions: true, presetId } })
                .then(response => {
                    this.drafts = response?.data; // Store the draft details
                })
                .catch(error => {
                    console.error('Error fetching draft:', error);
                });
        }
    },
    watch: {
        filters: {
            handler() {
                if (this.filters.presetId) {
                    this.loadDraftsByPresetId(this.filters.presetId);
                }
            },
            deep: true,
            immediate: true
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

                // debugger;
                let date = new Date(element.created_at);
                element.formattedDate = formatter.format(date);
                console.info(element)
                return element;
            });

            return filteredDrafts.sort((a, b) => new Date(b["created_at"]) - new Date(a["created_at"]))
        }
    },
    data() {
        return {
            drafts: [],
            expandedRows: [],

            headers: [{
                title: 'Datum',
                key: 'formattedDate',
                order: "desc"
            }, {
                title: 'Host',
                key: 'nameHost'
            }, {
                title: 'Gast',
                key: 'nameGuest'
            }]
        }

    }
}
</script>

<style>
td {
    img.icon-draft-type {
        width: 20px;
        vertical-align: bottom;
    }
}
</style>
