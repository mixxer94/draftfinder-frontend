<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// --- API base (same origin proxy to backend) ---
const API = '/api/gliddencup'

// --- Auth state ---
const tokenKey = 'gliddencup_token'
const usernameKey = 'gliddencup_username'
const token = ref(localStorage.getItem(tokenKey) || '')
const me = ref(localStorage.getItem(usernameKey) || '')

const auth = reactive({
    username: '',
    password: '',
    loading: false,
    error: '',
})

function setSession(t, user) {
    token.value = t;
    me.value = user?.username || '';

    if (t) {
        localStorage.setItem(tokenKey, t);
    } else {
        localStorage.removeItem(tokenKey);
    }

    if (me.value) {
        localStorage.setItem(usernameKey, me.value);
    } else {
        localStorage.removeItem(usernameKey);
    }
}

async function api(path, opts = {}) {
    const headers = opts.headers ? { ...opts.headers } : {}
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
    if (token.value) headers['Authorization'] = `Bearer ${token.value}`
    const res = await fetch(`${API}${path}`, {
        method: 'GET',
        ...opts,
        headers,
    })
    if (!res.ok) {
        let msg = 'Request failed'
        try { const j = await res.json(); msg = j?.error || msg } catch { }
        throw new Error(msg)
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
}

// --- Tabs ---
const tab = ref('account')

// --- Signup / Login ---
async function doSignup() {
    auth.loading = true; auth.error = ''
    try {
        const data = await api('/signup', {
            method: 'POST',
            body: JSON.stringify({
                username: auth.username.trim(),
                password: auth.password
            })
        })
        setSession(data.token, data.user)
        tab.value = 'tips'
    } catch (e) { auth.error = e.message }
    finally { auth.loading = false }
}

async function doLogin() {
    auth.loading = true; auth.error = ''
    try {
        const data = await api('/login', {
            method: 'POST',
            body: JSON.stringify({
                username: auth.username.trim(),
                password: auth.password
            })
        })
        setSession(data.token, data.user)
        tab.value = 'tips'
        await loadMyTips()
    } catch (e) { auth.error = e.message }
    finally { auth.loading = false }
}

function logout() {
    setSession('', '')
}

// --- Profiles & Tips ---
const profiles = ref([])
const profilesLoading = ref(false)
const profilesError = ref('')
const picks = ref([]) // array of { profileId, playerName }
const tipsLoading = ref(false)
const tipsSaved = ref(false)
const tipsError = ref('')

function buildPicksFromProfiles() {
    const existing = new Map(picks.value.map(p => [p.profileId, p.playerName]))
    picks.value = profiles.value.map(p => ({ profileId: p.id, playerName: existing.get(p.id) || '' }))
}

async function loadProfiles() {
    profilesLoading.value = true; profilesError.value = ''
    try {
        const data = await api('/profiles')
        profiles.value = Array.isArray(data) ? data : []
        buildPicksFromProfiles()
    } catch (e) {
        profilesError.value = e.message
        profiles.value = []
    } finally {
        profilesLoading.value = false
    }
}

async function loadMyTips() {
    if (!token.value || !profiles.value.length) return
    const res = await api('/tips/me')
    if (Array.isArray(res?.picks)) {
        const map = new Map(res.picks.map(p => [p.profileId, p.playerName]))
        picks.value = profiles.value.map(p => ({ profileId: p.id, playerName: map.get(p.id) || '' }))
    }
}

async function saveTips() {
    tipsLoading.value = true; tipsError.value = ''; tipsSaved.value = false
    try {
        // validation: all 16 filled
        const missing = picks.value.find(p => !p.playerName || !p.playerName.trim())
        // if (missing) throw new Error('Bitte alle 16 Felder ausfüllen.')
        await api('/tips', {
            method: 'POST',
            body: JSON.stringify({
                picks: picks.value.map(p => ({
                    profileId: p.profileId,
                    playerName: p.playerName.trim()
                }))
            })
        })
        tipsSaved.value = true
    } catch (e) { tipsError.value = e.message }
    finally { tipsLoading.value = false }
}

// --- Public users & tips ---
const users = ref([])
const selectedUser = ref('')
const selectedTips = ref([])
const publicLoading = ref(false)
const publicError = ref('')

async function loadUsers() {
    try {
        users.value = await api('/users')
    } catch (e) { console.error(e) }
}

async function loadPublicTips(username) {
    if (!username) return
    publicLoading.value = true; publicError.value = ''; selectedTips.value = []
    try {
        const data = await api(`/tips/${encodeURIComponent(username)}`)
        selectedTips.value = Array.isArray(data?.picks) ? data.picks : []
    } catch (e) { publicError.value = e.message }
    finally { publicLoading.value = false }
}

onMounted(async () => {
    await loadProfiles()
    await loadUsers()
    if (token.value) await loadMyTips()
})
</script>

<template>
    <v-container class="py-6">
        <v-card elevation="1" class="mb-6">
            <v-toolbar density="comfortable" color="primary" dark>
                <v-toolbar-title>/gliddencup</v-toolbar-title>
                <v-spacer />
                <div v-if="me">
                    <v-chip color="secondary" class="mr-2" label>{{ me }}</v-chip>
                    <v-btn variant="outlined" @click="logout">Logout</v-btn>
                </div>
            </v-toolbar>

            <v-tabs v-model="tab" bg-color="primary" color="white" grow>
                <v-tab value="account">Account</v-tab>
                <v-tab value="tips">Tipps abgeben</v-tab>
                <v-tab value="public">Accounts & Tipps</v-tab>
            </v-tabs>
        </v-card>

        <!-- Account Tab -->
        <v-window v-model="tab">
            <v-window-item value="account">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-card elevation="1" class="pa-4">
                            <h3 class="mb-4">Anmelden</h3>
                            <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-3">{{ auth.error
                                }}</v-alert>
                            <v-text-field v-model="auth.username" label="Username" density="comfortable"
                                variant="outlined" />
                            <v-text-field v-model="auth.password" type="password" label="Passwort" density="comfortable"
                                variant="outlined" />
                            <v-btn :loading="auth.loading" color="primary" class="mt-2" @click="doLogin">Login</v-btn>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-card elevation="1" class="pa-4">
                            <h3 class="mb-4">Registrieren</h3>
                            <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-3">{{ auth.error
                                }}</v-alert>
                            <v-text-field v-model="auth.username" label="Username" density="comfortable"
                                variant="outlined" />
                            <v-text-field v-model="auth.password" type="password" label="Passwort" density="comfortable"
                                variant="outlined" />
                            <v-btn :loading="auth.loading" color="secondary" class="mt-2"
                                @click="doSignup">Signup</v-btn>
                        </v-card>
                    </v-col>
                </v-row>
            </v-window-item>

            <!-- Tipps Tab -->
            <v-window-item value="tips">
                <v-card elevation="1" class="pa-4">
                    <div class="d-flex align-center mb-4">
                        <h3 class="mr-4 mb-0">Tipps abgeben</h3>
                        <v-chip v-if="!token" color="warning" variant="tonal">Bitte einloggen, um Tipps zu
                            speichern</v-chip>
                    </div>

                    <v-alert v-if="tipsError" type="error" variant="tonal" class="mb-3">{{ tipsError }}</v-alert>
                    <v-alert v-if="tipsSaved" type="success" variant="tonal" class="mb-3">Gespeichert!</v-alert>

                    <v-row>
                        <v-col cols="12" md="6" lg="4" v-for="p in picks" :key="p.profileId">
                            <v-text-field :label="profiles.find(x => x.id === p.profileId)?.label"
                                v-model="p.playerName" density="comfortable" variant="outlined" hide-details="auto"
                                persistent-placeholder :disabled="!token" />
                        </v-col>
                    </v-row>

                    <div class="d-flex justify-end">
                        <v-btn color="primary" :loading="tipsLoading" :disabled="!token"
                            @click="saveTips">Speichern</v-btn>
                    </div>
                </v-card>
            </v-window-item>

            <!-- Public Tab -->
            <v-window-item value="public">
                <v-card elevation="1" class="pa-4">
                    <h3 class="mb-4">Accounts & Tipps</h3>
                    <v-row class="mb-4" align="center">
                        <v-col cols="12" md="6">
                            <v-autocomplete label="Account auswählen" :items="users.map(u => u.username)"
                                v-model="selectedUser" clearable density="comfortable" variant="outlined"
                                @update:modelValue="loadPublicTips" />
                        </v-col>
                    </v-row>

                    <v-alert v-if="publicError" type="error" variant="tonal" class="mb-3">{{ publicError }}</v-alert>

                    <v-skeleton-loader v-if="publicLoading" type="table" />

                    <v-row v-else>
                        <v-col cols="12" md="6" lg="4" v-for="p in selectedTips" :key="p.profileId">
                            <v-card variant="tonal" class="pa-3">
                                <div class="text-caption text-medium-emphasis mb-1">{{ profiles.find(x => x.id === p.profileId)?.label }}</div>
                                <div class="text-subtitle-1">{{ p.playerName || '—' }}</div>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card>
            </v-window-item>
        </v-window>
    </v-container>
</template>

<style scoped>
</style>
