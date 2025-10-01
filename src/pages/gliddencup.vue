<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppBar from '../components/AppBar.vue'

// --- API base ---
const API = '/api/gliddencup'

// Auth state
const tokenKey = 'gliddencup_token'
const usernameKey = 'gliddencup_username'
const token = ref(localStorage.getItem(tokenKey) || '')
const me = ref(localStorage.getItem(usernameKey) || '')

const auth = reactive({ username: '', password: '', loading: false, error: '' })

function setSession(t, user) {
    token.value = t
    me.value = user?.username || ''
    if (t) localStorage.setItem(tokenKey, t); else localStorage.removeItem(tokenKey)
    if (me.value) localStorage.setItem(usernameKey, me.value); else localStorage.removeItem(usernameKey)
}

async function api(path, opts = {}) {
    const headers = opts.headers ? { ...opts.headers } : {}
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
    if (token.value) headers['Authorization'] = `Bearer ${token.value}`
    const res = await fetch(`${API}${path}`, { method: 'GET', ...opts, headers })
    if (!res.ok) {
        let msg = 'Request failed'
        try { const j = await res.json(); msg = j?.error || msg } catch { }
        throw new Error(msg)
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
}

// Tabs – "public" zuerst
const tab = ref('public')

// Auth actions
async function doSignup() {
    auth.loading = true; auth.error = ''
    try {
        const data = await api('/signup', { method: 'POST', body: JSON.stringify({ username: auth.username.trim(), password: auth.password }) })
        setSession(data.token, data.user); tab.value = 'tips'; await loadMyTips()
    } catch (e) { auth.error = e.message } finally { auth.loading = false }
}
async function doLogin() {
    auth.loading = true; auth.error = ''
    try {
        const data = await api('/login', { method: 'POST', body: JSON.stringify({ username: auth.username.trim(), password: auth.password }) })
        setSession(data.token, data.user); tab.value = 'tips'; await loadMyTips()
    } catch (e) { auth.error = e.message } finally { auth.loading = false }
}
function logout() { setSession('', '') }

// Profiles & tips
const profiles = ref([]), picks = ref([])
const profilesLoading = ref(false), profilesError = ref('')
const tipsLoading = ref(false), tipsSaved = ref(false), tipsError = ref('')

function buildPicksFromProfiles() {
    const existing = new Map(picks.value.map(p => [p.profileId, p.playerName]))
    picks.value = profiles.value.map(p => ({ profileId: p.id, playerName: existing.get(p.id) || '' }))
}
async function loadProfiles() {
    profilesLoading.value = true; profilesError.value = ''
    try { const data = await api('/profiles'); profiles.value = Array.isArray(data) ? data : []; buildPicksFromProfiles() }
    catch (e) { profilesError.value = e.message; profiles.value = [] }
    finally { profilesLoading.value = false }
}
async function loadMyTips() {
    if (!token.value || !profiles.value.length) return
    try {
        const res = await api('/tips/me')
        if (Array.isArray(res?.picks)) {
            const map = new Map(res.picks.map(p => [p.profileId, p.playerName]))
            picks.value = profiles.value.map(p => ({ profileId: p.id, playerName: map.get(p.id) || '' }))
        }
    } catch { }
}
async function saveTips() {
    tipsLoading.value = true; tipsError.value = ''; tipsSaved.value = false
    try {
        await api('/tips', {
            method: 'POST',
            body: JSON.stringify({
                picks: picks.value.map(p => ({ profileId: p.profileId, playerName: (p.playerName || '').trim() }))
            })
        })
        tipsSaved.value = true
    } catch (e) { tipsError.value = e.message } finally { tipsLoading.value = false }
}

// Public users & tips
const users = ref([]), selectedUser = ref(''), selectedTips = ref([])
const publicLoading = ref(false), publicError = ref('')
async function loadUsers() { try { users.value = await api('/users') } catch { } }

async function loadPublicTips(username) {
    if (!username) return
    publicLoading.value = true; publicError.value = ''; selectedTips.value = []
    try { const data = await api(`/tips/${encodeURIComponent(username)}`); selectedTips.value = Array.isArray(data?.picks) ? data.picks : [] }
    catch (e) { publicError.value = e.message } finally { publicLoading.value = false }
}

function selectUser(username) {
    selectedUser.value = username
    loadPublicTips(username)
}

onMounted(async () => { await loadProfiles(); await loadUsers(); if (token.value) await loadMyTips() })
</script>

<template>
    <AppBar />

    <v-card class="pa-0">
        <!-- Tabs oben -->
        <v-tabs v-model="tab" bg-color="primary" color="white">
            <v-tab value="public">Tipps ansehen</v-tab>
            <v-tab value="tips">Tipps abgeben</v-tab>
        </v-tabs>
        <v-divider />

        <v-window v-model="tab">
            <!-- TAB 1: Tipps ansehen (zweispaltig) -->
            <v-window-item value="public">
                <div class="pa-4">
                    <v-row>
                        <!-- Spalte 1: Auswahl -->

                        <!-- <v-col cols="12" md="4">
              <h3 class="mb-4">Account wählen</h3>
              <v-card class="pa-4">
                <v-autocomplete
                  label="Account auswählen"
                  :items="users.map(u => u.username)"
                  v-model="selectedUser"
                  clearable
                  density="comfortable"
                  variant="outlined"
                  @update:modelValue="loadPublicTips"
                />
                <v-alert v-if="publicError" type="error" variant="tonal" class="mt-3">{{ publicError }}</v-alert>
                <v-skeleton-loader v-if="publicLoading" type="table" class="mt-3" />
              </v-card>
            </v-col> -->
                        <v-col cols="12" md="4">
                            <h3 class="mb-4">Accounts</h3>
                            <v-card class="pa-0">
                                <v-list lines="one" density="comfortable" nav>
                                    <v-skeleton-loader v-if="!users.length" type="list-item-two-line" class="ma-2" />
                                    <v-list-item v-for="u in users" :key="u.username" :value="u.username"
                                        @click="selectUser(u.username)" :active="selectedUser === u.username">
                                        <v-list-item-title>{{ u.username }}</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-card>

                            <v-alert v-if="publicError" type="error" variant="tonal" class="mt-3">{{ publicError
                                }}</v-alert>
                        </v-col>

                        <!-- Spalte 2: Ergebnisse -->
                        <v-col cols="12" md="8">
                            <h3 class="mb-4">Tipps</h3>
                            <v-card class="pa-4">
                                <div v-if="!selectedUser" class="text-body-2 mb-3">
                                    Wähle links einen Account, um die Tipps zu sehen.
                                </div>

                                <v-row v-if="selectedUser">
                                    <v-col cols="12" md="6" lg="4" v-for="p in selectedTips" :key="p.profileId">
                                        <v-card variant="tonal" class="pa-3">
                                            <div class="text-caption text-medium-emphasis mb-1">
                                                {{profiles.find(x => x.id === p.profileId)?.label}}
                                            </div>
                                            <div class="text-subtitle-1">
                                                {{ p.playerName && p.playerName.trim() ? p.playerName : '---' }}
                                            </div>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </v-window-item>

            <!-- TAB 2: Tipps abgeben (zweispaltig) -->
            <v-window-item value="tips">
                <div class="pa-4">
                    <v-row>
                        <!-- Spalte 1: Login/Signup -->
                        <v-col cols="12" md="4">
                            <h3 class="mb-4">Account</h3>
                            <v-card class="pa-4">
                                <div v-if="me" class="mb-3 d-flex align-center">
                                    <v-chip color="secondary" class="mr-2" label>{{ me }}</v-chip>
                                    <v-btn variant="outlined" @click="logout">Logout</v-btn>
                                </div>

                                <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-3">{{ auth.error
                                    }}</v-alert>

                                <v-text-field v-model="auth.username" label="Username" variant="outlined"
                                    density="comfortable" />
                                <v-text-field v-model="auth.password" label="Passwort" type="password"
                                    variant="outlined" density="comfortable" />

                                <div class="d-flex gap-2 mt-2">
                                    <v-btn :loading="auth.loading" color="primary" @click="doLogin">Login</v-btn>
                                    <v-btn :loading="auth.loading" color="secondary" @click="doSignup">Signup</v-btn>
                                </div>
                            </v-card>
                        </v-col>

                        <!-- Spalte 2: Formular -->
                        <v-col cols="12" md="8">
                            <h3 class="mb-4">Tipps abgeben / anpassen</h3>
                            <v-card class="pa-4">
                                <v-chip v-if="!token" color="warning" variant="tonal" class="mb-3">
                                    Bitte einloggen, um Tipps zu speichern
                                </v-chip>

                                <v-alert v-if="tipsError" type="error" variant="tonal" class="mb-3">{{ tipsError
                                    }}</v-alert>
                                <v-alert v-if="tipsSaved" type="success" variant="tonal"
                                    class="mb-3">Gespeichert!</v-alert>

                                <v-skeleton-loader v-if="profilesLoading" type="table" class="mb-4" />
                                <v-alert v-if="profilesError" type="error" variant="tonal" class="mb-3">{{ profilesError
                                    }}</v-alert>

                                <v-row v-if="profiles.length">
                                    <v-col cols="12" md="6" lg="4" v-for="p in picks" :key="p.profileId">
                                        <v-text-field :label="profiles.find(x => x.id === p.profileId)?.label"
                                            v-model="p.playerName" variant="outlined" density="comfortable"
                                            persistent-placeholder :disabled="!token" />
                                    </v-col>
                                </v-row>

                                <div class="d-flex justify-end">
                                    <v-btn color="primary" :loading="tipsLoading" :disabled="!token || !profiles.length"
                                        @click="saveTips">
                                        Speichern
                                    </v-btn>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </v-window-item>
        </v-window>
    </v-card>
</template>

<style scoped></style>
